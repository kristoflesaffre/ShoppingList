package be.shoppinglist.sfeer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * «ShoppingList Sfeer» op de projector, zonder Mac: toont de ingebouwde pagina (assets/page.html) schermvullend, volgt
 * zelf YouTube op de tv (LoungeFollower) en krijgt de instellingen (aan/uit, waar de tv zit, instellen) van de Pi:
 *   am start -n be.shoppinglist.sfeer/.MainActivity --es tv 192.168.132.111 --es settings <base64url JSON>
 * Een volgende `am start` met nieuwe instellingen werkt de pagina meteen bij. «Terug» sluit de app.
 */
public final class MainActivity extends Activity implements LocalServer.Source {
  private static final Pattern PRIVATE_V4 = Pattern.compile("^(?:10\\.\\d{1,3}|192\\.168|172\\.(?:1[6-9]|2\\d|3[01]))\\.\\d{1,3}\\.\\d{1,3}$");

  private WebView web;
  private LocalServer server;
  private LoungeFollower follower;
  private String followerHost;
  private byte[] page;
  private volatile JSONObject settings = new JSONObject();

  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
    try {
      page = readAsset("page.html");
      server = new LocalServer(this);
    } catch (Exception e) {
      finish();
      return;
    }
    web = new WebView(this);
    web.setBackgroundColor(Color.BLACK);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setSupportMultipleWindows(false);
    final String origin = "http://localhost:" + server.port();
    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri u = request.getUrl();
        return !(u.getScheme() + "://" + u.getAuthority()).equals(origin);
      }
    });
    setContentView(web);
    hideSystemUi();
    apply(getIntent());
    web.loadUrl(origin + "/");
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    apply(intent);
  }

  /** Tv-adres en instellingen uit de opdracht van de Pi; ongeldige waarden worden genegeerd. */
  private void apply(Intent intent) {
    if (intent == null) return;
    String tv = intent.getStringExtra("tv");
    if (tv != null && PRIVATE_V4.matcher(tv).matches() && !tv.equals(followerHost)) {
      if (follower != null) follower.stop();
      follower = new LoungeFollower(tv);
      followerHost = tv;
    }
    String raw = intent.getStringExtra("settings");
    if (raw != null && raw.length() < 4000) {
      try {
        String json = new String(Base64.decode(raw, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), StandardCharsets.UTF_8);
        settings = new JSONObject(json);
      } catch (Exception ignored) {
        // Ongeldig: de vorige instellingen blijven.
      }
    }
  }

  @Override
  public byte[] page() {
    return page;
  }

  @Override
  public String state() {
    JSONObject o = new JSONObject();
    try {
      JSONObject s = settings;
      o.put("enabled", s.optBoolean("enabled", false));
      o.put("calibrating", s.optBoolean("calibrating", false));
      o.put("mask", s.opt("mask") == null ? JSONObject.NULL : s.opt("mask"));
      o.put("tv", follower == null ? JSONObject.NULL : follower.snapshot());
    } catch (Exception ignored) {
    }
    return o.toString();
  }

  private byte[] readAsset(String name) throws Exception {
    try (InputStream in = getAssets().open(name)) {
      ByteArrayOutputStream b = new ByteArrayOutputStream();
      byte[] buf = new byte[16384];
      for (int n; (n = in.read(buf)) != -1; ) b.write(buf, 0, n);
      return b.toByteArray();
    }
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) hideSystemUi();
  }

  @SuppressWarnings("deprecation")
  private void hideSystemUi() {
    getWindow().getDecorView().setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }

  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      finish();
      return true;
    }
    return super.onKeyDown(keyCode, event);
  }

  @Override
  protected void onDestroy() {
    if (follower != null) follower.stop();
    if (server != null) server.close();
    if (web != null) {
      web.loadUrl("about:blank");
      web.destroy();
    }
    super.onDestroy();
  }
}
