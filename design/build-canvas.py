"""Bouwt design/canvas.html uit canvas.src.html + productfoto's + borden (gepubliceerd als artifact)."""
import base64, os, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
imgs_js = open(sys.argv[1]).read()
def svg_uri(name):
    return "data:image/svg+xml;base64," + base64.b64encode(open(os.path.join(root, "public/icons", name), "rb").read()).decode()
def svg_uri_logo(name):
    return "data:image/svg+xml;base64," + base64.b64encode(open(os.path.join(root, "public/logos", name), "rb").read()).decode()
assets = (
    f'<style>:root{{--snow:url("{svg_uri("freeze.svg")}");--jar:url("{svg_uri("pantry.svg")}")}}</style>\n'
    f"<script>{imgs_js}</script>\n"
    f'<script>IMG.lidl="{svg_uri_logo("logos-lidl.svg")}";IMG.delhaize="{svg_uri_logo("logos-delhaize.svg")}";</script>\n'
    f"<script>{open(os.path.join(here, 'items-toevoegen-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'agenda-tiles-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'agenda-hero-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'agenda-dashboard-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'agenda-dashboard-a-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-hue-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-dark-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-hue-modal-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-sunset-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-sunset-glass-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-day-agenda-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-day-agenda2-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'toon-alle-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'toon-alle-chip-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'toon-alle-stack-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'glass-toggle-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'todo-tiles-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'todo-postit-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'todo-corkboard-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'todo-sharp-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-dark-tiles-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'watching-panel-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'airco-cards-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'airco-a3-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-combined-modal-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'dashboard-combined-modal-b-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'ambience-data.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'ambience-dashboard-boards.js')).read()}</script>\n"
    f"<script>{open(os.path.join(here, 'shutter-controls-boards.js')).read()}</script>\n"
)
src = open(os.path.join(here, "canvas.src.html")).read()
open(os.path.join(here, "canvas.html"), "w").write(src.replace("<!--ASSETS-->", assets))
print("ok", os.path.getsize(os.path.join(here, "canvas.html")) // 1024, "KB")
