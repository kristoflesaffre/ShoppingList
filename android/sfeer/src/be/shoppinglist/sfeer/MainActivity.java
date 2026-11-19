package be.shoppinglist.sfeer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.regex.Pattern;

/**
 * «ShoppingList Sfeer» op de projector: één WebView, schermvullend, zonder adresbalk, die enkel de projectorpagina
 * van «Ook rond de tv» toont (http://<Mac op het thuisnetwerk>:<poort>/projector/sfeer?key=…). Video mag starten
 * zonder tik (de pagina speelt altijd zonder geluid). Geopend door de Pi-bridge (`ambience-show`); «terug» sluit ze.
 */
public final class MainActivity extends Activity {
  /** Dezelfde regel als de bridge (AMBIENCE_URL): enkel een privé-IPv4-adres, enkel deze pagina. */
  private static final Pattern PAGE = Pattern.compile(
      "^http://(?:10|192\\.168|172\\.(?:1[6-9]|2\\d|3[01]))(?:\\.\\d{1,3}){2,3}:\\d{2,5}/projector/sfeer\\?key=[A-Za-z0-9_-]{32,64}$");

  private WebView web;
  private String origin;

  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
    web = new WebView(this);
    web.setBackgroundColor(Color.BLACK);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setSupportMultipleWindows(false);
    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        // Enkel binnen de eigen pagina navigeren; de YouTube-speler laadt als iframe en valt hier niet onder.
        Uri u = request.getUrl();
        return origin == null || !(u.getScheme() + "://" + u.getAuthority()).equals(origin);
      }
    });
    setContentView(web);
    hideSystemUi();
    open(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    open(intent);
  }

  private void open(Intent intent) {
    Uri data = intent == null ? null : intent.getData();
    String url = data == null ? null : data.toString();
    if (url == null || !PAGE.matcher(url).matches()) {
      finish();
      return;
    }
    // De pagina komt via http://localhost:<poort> (LocalProxy): YouTube weigert ingesloten video's op een IP-adres.
    String mac = data.getScheme() + "://" + data.getAuthority();
    try {
      if (proxy == null || !mac.equals(proxyTarget)) {
        if (proxy != null) proxy.close();
        proxy = new LocalProxy(mac);
        proxyTarget = mac;
      }
    } catch (java.io.IOException e) {
      finish();
      return;
    }
    origin = "http://localhost:" + proxy.port();
    web.loadUrl(origin + data.getEncodedPath() + "?" + data.getEncodedQuery());
  }

  private LocalProxy proxy;
  private String proxyTarget;

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
    if (proxy != null) proxy.close();
    if (web != null) {
      web.loadUrl("about:blank");
      web.destroy();
    }
    super.onDestroy();
  }
}
