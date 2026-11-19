package be.shoppinglist.sfeer;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Volgt YouTube op de Samsung-tv zoals een afstandsbediening (YouTube «Lounge», dezelfde weg als de gsm-app):
 * welke video, op welke tijd, speelt of pauze. Enkel meelezen; de projector stuurt de tv nooit aan.
 * Zelfde aanpak als vroeger op de Mac (src/lib/server/ambience-projector.ts, nu niet meer gebruikt).
 */
final class LoungeFollower {
  private static final String BASE = "https://www.youtube.com/api/lounge/bc/bind";
  private static final Pattern SCREEN = Pattern.compile("<screenId>([^<]+)</screenId>");
  private static final Pattern SID = Pattern.compile("\\[\"c\",\"([^\"]+)\"");
  private static final Pattern GSESSION = Pattern.compile("\\[\"S\",\"([^\"]+)\"");

  private final String host;
  private volatile boolean running = true;

  private String videoId;
  private double time;
  private long at;
  private String state = "idle";

  LoungeFollower(String host) {
    this.host = host;
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        loop();
      }
    }, "sfeer-lounge");
    t.setDaemon(true);
    t.start();
  }

  void stop() {
    running = false;
  }

  /** {videoId, position (s, doorgerekend), state} als JSON-object. */
  synchronized JSONObject snapshot() {
    JSONObject o = new JSONObject();
    try {
      o.put("videoId", videoId == null ? JSONObject.NULL : videoId);
      double pos = "playing".equals(state) ? time + Math.max(0, System.currentTimeMillis() - at) / 1000.0 : time;
      o.put("position", pos);
      o.put("state", state);
    } catch (Exception ignored) {
    }
    return o;
  }

  private synchronized void idle() {
    videoId = null;
    state = "idle";
  }

  private static String stateName(String raw) {
    if ("1".equals(raw)) return "playing";
    if ("2".equals(raw)) return "paused";
    if ("3".equals(raw)) return "buffering";
    if ("0".equals(raw)) return "ended";
    if ("1081".equals(raw)) return "ad";
    return "idle";
  }

  private synchronized void apply(String name, JSONObject d) {
    long now = System.currentTimeMillis();
    if (name.equals("nowPlaying") || name.equals("onStateChange")) {
      String id = d.optString("videoId", "");
      if (!id.isEmpty()) videoId = id;
      else if (name.equals("nowPlaying")) videoId = null;
      if (d.has("currentTime")) time = d.optDouble("currentTime", time);
      if (d.has("state")) state = stateName(d.optString("state"));
      at = now;
    } else if (name.equals("onAdStateChange")) {
      if ("1".equals(d.optString("adState"))) state = "ad";
      else if ("ad".equals(state)) state = "playing";
      at = now;
    }
  }

  private static String read(InputStream in) throws Exception {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    byte[] buf = new byte[8192];
    for (int n; (n = in.read(buf)) != -1; ) b.write(buf, 0, n);
    return new String(b.toByteArray(), StandardCharsets.UTF_8);
  }

  private static String query(Map<String, String> params) throws Exception {
    StringBuilder q = new StringBuilder();
    for (Map.Entry<String, String> e : params.entrySet()) {
      if (q.length() > 0) q.append('&');
      q.append(URLEncoder.encode(e.getKey(), "UTF-8")).append('=').append(URLEncoder.encode(e.getValue(), "UTF-8"));
    }
    return q.toString();
  }

  private static String post(String url, String body, int timeout) throws Exception {
    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
    c.setConnectTimeout(8000);
    c.setReadTimeout(timeout);
    c.setRequestMethod("POST");
    c.setDoOutput(true);
    c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
    try (OutputStream o = c.getOutputStream()) {
      o.write(body.getBytes(StandardCharsets.UTF_8));
    }
    if (c.getResponseCode() >= 400) throw new Exception("http " + c.getResponseCode());
    return read(c.getInputStream());
  }

  /** Eén JSON-stuk («[[id,["naam",{…}]],…]») toepassen; geeft het hoogste id. */
  private int apply(String chunk, int aid) {
    try {
      JSONArray arr = new JSONArray(chunk);
      for (int k = 0; k < arr.length(); k++) {
        JSONArray entry = arr.optJSONArray(k);
        if (entry == null) continue;
        aid = Math.max(aid, entry.optInt(0, aid));
        JSONArray ev = entry.optJSONArray(1);
        if (ev == null) continue;
        JSONObject d = ev.optJSONObject(1);
        apply(ev.optString(0, ""), d == null ? new JSONObject() : d);
      }
    } catch (Exception ignored) {
    }
    return aid;
  }

  /**
   * Leest «<lengte>\n<JSON>» na elkaar uit `buf` (bytes), zolang een stuk volledig binnen is; de rest blijft staan voor
   * de volgende lees-ronde. Geeft het hoogste id.
   */
  private int consume(ByteArrayOutputStream buf, int aid) {
    byte[] b = buf.toByteArray();
    int i = 0;
    while (true) {
      int p = i;
      while (p < b.length && (b[p] == '\n' || b[p] == '\r' || b[p] == ' ')) p++;
      int nl = p;
      while (nl < b.length && b[nl] >= '0' && b[nl] <= '9') nl++;
      if (nl == p || nl >= b.length || b[nl] != '\n') break;
      int len = Integer.parseInt(new String(b, p, nl - p, StandardCharsets.US_ASCII));
      if (b.length < nl + 1 + len) break;
      aid = apply(new String(b, nl + 1, len, StandardCharsets.UTF_8), aid);
      i = nl + 1 + len;
    }
    if (i > 0) {
      byte[] rest = java.util.Arrays.copyOfRange(b, i, b.length);
      buf.reset();
      buf.write(rest, 0, rest.length);
    }
    return aid;
  }

  private void loop() {
    int failures = 0;
    SecureRandom random = new SecureRandom();
    while (running) {
      try {
        HttpURLConnection dial = (HttpURLConnection) new URL("http://" + host + ":8080/ws/apps/YouTube").openConnection();
        dial.setConnectTimeout(5000);
        dial.setReadTimeout(5000);
        Matcher m = SCREEN.matcher(read(dial.getInputStream()));
        if (!m.find()) throw new Exception("no-screen");
        JSONObject tokens = new JSONObject(post("https://www.youtube.com/api/lounge/pairing/get_lounge_token_batch", "screen_ids=" + URLEncoder.encode(m.group(1), "UTF-8"), 8000));
        String token = tokens.getJSONArray("screens").getJSONObject(0).getString("loungeToken");

        Map<String, String> common = new LinkedHashMap<String, String>();
        common.put("device", "REMOTE_CONTROL");
        common.put("id", UUID.randomUUID().toString());
        common.put("name", "ShoppingList Sfeer");
        common.put("app", "youtube-desktop");
        common.put("mdx-version", "3");
        common.put("loungeIdToken", token);
        common.put("VER", "8");
        common.put("v", "2");
        common.put("CVER", "1");
        common.put("theme", "cl");
        common.put("capabilities", "");
        common.put("ui", "");
        common.put("t", "1");
        int rid = 10000 + random.nextInt(80000);

        Map<String, String> bindParams = new LinkedHashMap<String, String>(common);
        bindParams.put("RID", String.valueOf(rid++));
        String bound = post(BASE + "?" + query(bindParams), "count=0", 10000);
        Matcher sid = SID.matcher(bound);
        Matcher gs = GSESSION.matcher(bound);
        if (!sid.find() || !gs.find()) throw new Exception("bind");
        ByteArrayOutputStream first = new ByteArrayOutputStream();
        byte[] boundBytes = bound.getBytes(StandardCharsets.UTF_8);
        first.write(boundBytes, 0, boundBytes.length);
        int aid = consume(first, 0);
        failures = 0;
        long lastRefresh = System.currentTimeMillis();

        // Lange vraag: YouTube stuurt elke wijziging meteen; om de 15 s de positie opnieuw vragen.
        while (running) {
          Map<String, String> pollParams = new LinkedHashMap<String, String>(common);
          pollParams.put("SID", sid.group(1));
          pollParams.put("gsessionid", gs.group(1));
          pollParams.put("RID", "rpc");
          pollParams.put("AID", String.valueOf(aid));
          pollParams.put("CI", "0");
          pollParams.put("TYPE", "xmlhttp");
          HttpURLConnection poll = (HttpURLConnection) new URL(BASE + "?" + query(pollParams)).openConnection();
          poll.setConnectTimeout(8000);
          poll.setReadTimeout(20000);
          int code = poll.getResponseCode();
          if (code >= 400) throw new Exception("poll " + code);
          InputStream in = poll.getInputStream();
          byte[] buf = new byte[8192];
          ByteArrayOutputStream pending = new ByteArrayOutputStream();
          try {
            for (int n; running && (n = in.read(buf)) != -1; ) {
              pending.write(buf, 0, n);
              aid = consume(pending, aid);
              if (System.currentTimeMillis() - lastRefresh > 15000) {
                lastRefresh = System.currentTimeMillis();
                Map<String, String> refresh = new LinkedHashMap<String, String>(common);
                refresh.put("SID", sid.group(1));
                refresh.put("gsessionid", gs.group(1));
                refresh.put("RID", String.valueOf(rid++));
                refresh.put("AID", String.valueOf(aid));
                final String url = BASE + "?" + query(refresh);
                new Thread(new Runnable() {
                  @Override
                  public void run() {
                    try {
                      post(url, "count=1&ofs=0&req0__sc=getNowPlaying", 8000);
                    } catch (Exception ignored) {
                    }
                  }
                }).start();
              }
            }
          } catch (java.net.SocketTimeoutException timeout) {
            // Gewoon een nieuwe lange vraag.
          } finally {
            in.close();
          }
        }
      } catch (Exception e) {
        failures++;
        // Tv uit of YouTube dicht: niets speelt.
        if (failures >= 2) idle();
        try {
          Thread.sleep(Math.min(10000, 1500L * failures));
        } catch (InterruptedException ignored) {
          return;
        }
      }
    }
  }
}
