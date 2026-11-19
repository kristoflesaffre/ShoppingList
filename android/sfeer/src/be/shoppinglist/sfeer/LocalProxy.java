package be.shoppinglist.sfeer;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Doorgeefluik op http://localhost:<poort> naar de Mac (http://192.168.x.y:3010). YouTube weigert een ingesloten
 * video als de pagina van een IP-adres komt («This video is unavailable»), maar aanvaardt «localhost». Enkel
 * bereikbaar vanop de projector zelf (127.0.0.1); stuurt alles door naar die ene Mac, niets anders.
 */
final class LocalProxy {
  private final String target;
  private final ServerSocket server;
  private final ExecutorService pool = Executors.newCachedThreadPool();
  private volatile boolean running = true;

  LocalProxy(String target) throws IOException {
    this.target = target;
    server = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        while (running) {
          try {
            final Socket s = server.accept();
            pool.execute(new Runnable() {
              @Override
              public void run() {
                handle(s);
              }
            });
          } catch (IOException e) {
            if (!running) return;
          }
        }
      }
    }, "sfeer-proxy");
    t.setDaemon(true);
    t.start();
  }

  int port() {
    return server.getLocalPort();
  }

  void close() {
    running = false;
    try {
      server.close();
    } catch (IOException ignored) {
    }
    pool.shutdownNow();
  }

  private static String readLine(InputStream in) throws IOException {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    int c;
    while ((c = in.read()) != -1) {
      if (c == '\n') break;
      if (c != '\r') b.write(c);
    }
    return c == -1 && b.size() == 0 ? null : new String(b.toByteArray(), StandardCharsets.ISO_8859_1);
  }

  private void handle(Socket socket) {
    try (Socket s = socket) {
      s.setSoTimeout(30000);
      InputStream in = new BufferedInputStream(s.getInputStream());
      String requestLine = readLine(in);
      if (requestLine == null) return;
      String[] parts = requestLine.split(" ");
      if (parts.length < 2 || !parts[1].startsWith("/")) return;
      String method = parts[0];
      if (!method.equals("GET") && !method.equals("POST") && !method.equals("HEAD")) return;
      String contentType = null;
      int length = 0;
      for (String line = readLine(in); line != null && !line.isEmpty(); line = readLine(in)) {
        int colon = line.indexOf(':');
        if (colon < 0) continue;
        String name = line.substring(0, colon).trim().toLowerCase();
        String value = line.substring(colon + 1).trim();
        if (name.equals("content-type")) contentType = value;
        if (name.equals("content-length")) length = Integer.parseInt(value);
      }
      byte[] body = new byte[Math.max(0, Math.min(length, 1 << 20))];
      int read = 0;
      while (read < body.length) {
        int n = in.read(body, read, body.length - read);
        if (n < 0) break;
        read += n;
      }

      HttpURLConnection c = (HttpURLConnection) new URL(target + parts[1]).openConnection();
      c.setInstanceFollowRedirects(false);
      c.setConnectTimeout(8000);
      c.setReadTimeout(30000);
      c.setRequestMethod(method);
      if (contentType != null) c.setRequestProperty("Content-Type", contentType);
      if (method.equals("POST")) {
        c.setDoOutput(true);
        try (OutputStream o = c.getOutputStream()) {
          o.write(body, 0, read);
        }
      }
      int status = c.getResponseCode();
      InputStream rin = status >= 400 ? c.getErrorStream() : c.getInputStream();
      ByteArrayOutputStream data = new ByteArrayOutputStream();
      if (rin != null && !method.equals("HEAD")) {
        byte[] buf = new byte[16384];
        for (int n; (n = rin.read(buf)) != -1; ) data.write(buf, 0, n);
        rin.close();
      }
      StringBuilder head = new StringBuilder("HTTP/1.1 ").append(status).append(' ').append(c.getResponseMessage() == null ? "" : c.getResponseMessage()).append("\r\n");
      for (Map.Entry<String, List<String>> h : c.getHeaderFields().entrySet()) {
        String name = h.getKey();
        if (name == null) continue;
        String lower = name.toLowerCase();
        // Lengte en codering zetten we zelf (de body is al gedecodeerd); verbinding altijd sluiten.
        if (lower.equals("content-length") || lower.equals("transfer-encoding") || lower.equals("connection") || lower.equals("content-encoding") || lower.equals("keep-alive")) continue;
        for (String v : h.getValue()) head.append(name).append(": ").append(v).append("\r\n");
      }
      head.append("Content-Length: ").append(data.size()).append("\r\nConnection: close\r\n\r\n");
      OutputStream out = s.getOutputStream();
      out.write(head.toString().getBytes(StandardCharsets.ISO_8859_1));
      data.writeTo(out);
      out.flush();
    } catch (Exception ignored) {
      // Verbinding weg of Mac onbereikbaar: de pagina probeert het zelf opnieuw.
    }
  }
}
