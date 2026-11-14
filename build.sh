#!/bin/bash
# Concatenates src files into dist/index.html (single self-contained file).
cd "$(dirname "$0")"
{ cat src/p1.html; cat src/p3s.html; echo '<script>'; cat src/p2.js src/p3a.js src/p4.js src/p3b.js; echo '</script>'; } > dist/app.html
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'; cat dist/app.html; echo '</body></html>'; } > dist/index.html
wc -c dist/index.html
