package be.shoppinglist.sfeer;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Kleine server op http://localhost:<poort>, enkel bereikbaar op de projector zelf: «/» = de ingebouwde pagina,
 * «/state» = instellingen + wat de tv speelt (JSON). Van localhost omdat YouTube ingesloten video's op een IP-adres weigert.
 */
final class LocalServer {
  interface Source {
    byte[] page();

    String state();
  }

  private final ServerSocket server;
  private final ExecutorService pool = Executors.newCachedThreadPool();
  private final Source source;
  private volatile boolean running = true;

  LocalServer(Source source) throws IOException {
    this.source = source;
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
    }, "sfeer-server");
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
      s.setSoTimeout(10000);
      InputStream in = new BufferedInputStream(s.getInputStream());
      String line = readLine(in);
      if (line == null) return;
      for (String h = readLine(in); h != null && !h.isEmpty(); h = readLine(in)) {
        // Koppen negeren: enkel GET.
      }
      String[] parts = line.split(" ");
      String path = parts.length > 1 ? parts[1] : "/";
      byte[] body;
      String type;
      int status = 200;
      if (path.equals("/state")) {
        body = source.state().getBytes(StandardCharsets.UTF_8);
        type = "application/json";
      } else if (path.equals("/") || path.startsWith("/?")) {
        body = source.page();
        type = "text/html; charset=utf-8";
      } else {
        body = new byte[0];
        type = "text/plain";
        status = 404;
      }
      OutputStream out = s.getOutputStream();
      String head = "HTTP/1.1 " + status + (status == 200 ? " OK" : " Not Found") + "\r\nContent-Type: " + type + "\r\nCache-Control: no-store\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n";
      out.write(head.getBytes(StandardCharsets.ISO_8859_1));
      out.write(body);
      out.flush();
    } catch (Exception ignored) {
    }
  }
}
