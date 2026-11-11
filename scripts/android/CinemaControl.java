import java.lang.reflect.*;
import java.util.*;

/** One-shot Stremio transport helper for the ADB shell: only «seek-back <ms>» on the Stremio media session.
 * Run: CLASSPATH=/data/local/tmp/shoppinglist-cinema-control-v1.dex app_process /system/bin CinemaControl seek-back 60000
 * Prints one JSON line. No other transport actions, no metadata output, no network.
 */
public final class CinemaControl {
  private static Object call(Object o, String method, Class<?>[] types, Object... args) throws Exception {
    Method m=o.getClass().getMethod(method, types);m.setAccessible(true);return m.invoke(o, args);
  }
  public static void main(String[] args) {
    String stage="args";
    try {
      if(args.length!=2||!"seek-back".equals(args[0]))throw new IllegalArgumentException();
      long delta=Long.parseLong(args[1]);
      if(delta!=60000&&delta!=120000&&delta!=300000)throw new IllegalArgumentException();
      stage="looper";
      Class<?> looper=Class.forName("android.os.Looper");
      if(looper.getMethod("getMainLooper").invoke(null)==null)looper.getMethod("prepareMainLooper").invoke(null);
      stage="context";
      Class<?> thread=Class.forName("android.app.ActivityThread");
      Object t=thread.getMethod("systemMain").invoke(null);
      Object context=thread.getMethod("getSystemContext").invoke(t);
      context=call(context,"createPackageContext",new Class<?>[]{String.class,int.class},"com.android.shell",0);
      stage="media-framework";
      try {
        Class<?> init=Class.forName("android.media.MediaFrameworkPlatformInitializer");
        if(init.getMethod("getMediaServiceManager").invoke(null)==null){Class<?> service=Class.forName("android.media.MediaServiceManager");init.getMethod("setMediaServiceManager",service).invoke(null,service.getConstructor().newInstance());}
      } catch(ClassNotFoundException olderAndroid) {}
      stage="sessions";
      Object manager=Class.forName("android.media.session.MediaSessionManager").getConstructor(Class.forName("android.content.Context")).newInstance(context);
      List<?> sessions=(List<?>)call(manager,"getActiveSessions",new Class<?>[]{Class.forName("android.content.ComponentName")},new Object[]{null});
      for(Object controller:sessions) {
        if(!"com.stremio.one".equals(call(controller,"getPackageName",new Class<?>[]{})))continue;
        stage="state";
        Object state=call(controller,"getPlaybackState",new Class<?>[]{});
        if(state==null){System.out.println("{\"ok\":false,\"error\":\"no-state\"}");System.exit(1);}
        long position=(Long)call(state,"getPosition",new Class<?>[]{});
        int playing=(Integer)call(state,"getState",new Class<?>[]{});
        if(playing==3){
          long updated=(Long)call(state,"getLastPositionUpdateTime",new Class<?>[]{});
          float speed=(Float)call(state,"getPlaybackSpeed",new Class<?>[]{});
          long now=(Long)Class.forName("android.os.SystemClock").getMethod("elapsedRealtime").invoke(null);
          if(updated>0&&now>=updated)position+= (long)((now-updated)*speed);
        }
        long target=Math.max(0,position-delta);
        stage="seek";
        Object controls=call(controller,"getTransportControls",new Class<?>[]{});
        call(controls,"seekTo",new Class<?>[]{long.class},target);
        System.out.println("{\"ok\":true,\"from\":"+position+",\"to\":"+target+"}");
        return;
      }
      System.out.println("{\"ok\":false,\"error\":\"no-stremio\"}");System.exit(1);
    } catch(Throwable e) {
      Throwable cause=e instanceof InvocationTargetException?((InvocationTargetException)e).getCause():e;
      System.out.println("{\"ok\":false,\"error\":\""+cause.getClass().getSimpleName()+"\",\"stage\":\""+stage+"\"}");
      System.exit(1);
    }
  }
}
