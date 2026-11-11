import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** One-shot, read-only Stremio metadata probe using the already-authorized ADB shell.
 * No transport controls, screenshots, network, private app storage or permission changes.
 * Raw media URIs are hashed on the projector and never printed.
 */
public final class CinemaMetadataProbe {
  private static Object call(Object o, String method, Class<?>[] types, Object... args) throws Exception {
    Method m=o.getClass().getMethod(method, types);m.setAccessible(true);return m.invoke(o, args);
  }
  private static String quote(Object value) {
    if (value == null) return "null";
    String s=value.toString();StringBuilder b=new StringBuilder("\"");
    for(char c:s.toCharArray()) { if(c=='"'||c=='\\')b.append('\\').append(c);else if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c); }
    return b.append('"').toString();
  }
  public static void main(String[] args) {
    String stage="looper";
    try {
      Class<?> looper=Class.forName("android.os.Looper");
      if(looper.getMethod("getMainLooper").invoke(null)==null)looper.getMethod("prepareMainLooper").invoke(null);
      stage="context";
      Class<?> thread=Class.forName("android.app.ActivityThread");
      Object t=thread.getMethod("systemMain").invoke(null);
      Object context=thread.getMethod("getSystemContext").invoke(t);
      stage="shell-context";
      context=call(context,"createPackageContext",new Class<?>[]{String.class,int.class},"com.android.shell",0);
      stage="media-framework";
      try {
        Class<?> init=Class.forName("android.media.MediaFrameworkPlatformInitializer");
        if(init.getMethod("getMediaServiceManager").invoke(null)==null){Class<?> service=Class.forName("android.media.MediaServiceManager");init.getMethod("setMediaServiceManager",service).invoke(null,service.getConstructor().newInstance());}
      } catch(ClassNotFoundException olderAndroid) {}
      stage="manager";
      Object manager=Class.forName("android.media.session.MediaSessionManager").getConstructor(Class.forName("android.content.Context")).newInstance(context);
      stage="sessions";
      List<?> sessions=(List<?>)call(manager,"getActiveSessions",new Class<?>[]{Class.forName("android.content.ComponentName")},new Object[]{null});
      stage="metadata";
      for(Object controller:sessions) {
        if(!"com.stremio.one".equals(call(controller,"getPackageName",new Class<?>[]{})))continue;
        Object metadata=call(controller,"getMetadata",new Class<?>[]{});
        if(metadata==null){System.out.println("{\"stremio\":true,\"metadata\":null}");return;}
        Set<?> keys=(Set<?>)call(metadata,"keySet",new Class<?>[]{});
        List<String> sorted=new ArrayList<>();for(Object k:keys)sorted.add(k.toString());Collections.sort(sorted);
        StringBuilder out=new StringBuilder("{\"stremio\":true,\"keys\":[");
        for(int i=0;i<sorted.size();i++){if(i>0)out.append(',');out.append(quote(sorted.get(i)));}
        out.append(']');
        for(String key:new String[]{"TITLE","DISPLAY_TITLE","MEDIA_ID","DURATION","MEDIA_URI"}){
          String full="android.media.metadata."+key;if(!keys.contains(full))continue;
          Object value=call(metadata,key.equals("DURATION")?"getLong":"getString",new Class<?>[]{String.class},full);
          if(key.equals("MEDIA_URI")){
            if(value==null||value.toString().isEmpty())continue;
            byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte v:bytes)hash.append(String.format("%02x",v&255));value=hash.toString();key="MEDIA_URI_SHA256";
          }
          out.append(',').append(quote(key)).append(':').append(quote(value));
        }
        System.out.println(out.append('}'));return;
      }
      System.out.println("{\"stremio\":false}");
    } catch(Throwable e) {
      // No exception message/stack dump: a vendor exception could include private metadata.
      Throwable cause=e instanceof InvocationTargetException?((InvocationTargetException)e).getCause():e;
      String trace="";for(StackTraceElement frame:cause.getStackTrace()){if(trace.length()>500)break;trace+=frame.getClassName()+"."+frame.getMethodName()+":"+frame.getLineNumber()+";";}
      System.out.println("{\"error\":"+quote(cause.getClass().getSimpleName())+",\"stage\":"+quote(stage)+",\"frames\":"+quote(trace)+"}");
      System.exit(1);
    }
  }
}
