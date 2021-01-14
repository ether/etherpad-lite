'use strict';

/* eslint-disable max-len */
/*
 * While importexport tests target the `setHTML` API endpoint, which is nearly identical to what happens
 * when a user manually imports a document via the UI, the contentcollector tests here don't use rehype to process
 * the document. Rehype removes spaces and newĺines were applicable, so the expected results here can
 * differ from importexport.js.
 *
 * If you add tests here, please also add them to importexport.js
 */

const contentcollector = require('../../../src/static/js/contentcollector');
const AttributePool = require('../../../src/static/js/AttributePool');
const cheerio = require('../../../src/node_modules/cheerio');

const tests = {
  image: {
    description: 'Puts an image in the content',
    html: '<html><body><p>image</p><img src="PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTY1MnB4IiBoZWlnaHQ9IjM1NXB4IiB2aWV3Qm94PSIwIDAgMTY1MiAzNTUiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+R3JvdXAgMTA8L3RpdGxlPgogICAgPGRlZnM+CiAgICAgICAgPGxpbmVhckdyYWRpZW50IHgxPSI1MCUiIHkxPSItNTMuMzE4MTY0JSIgeDI9IjUwJSIgeTI9IjEwOS42NTQ0OTclIiBpZD0ibGluZWFyR3JhZGllbnQtMSI+CiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiM2NUQwOUIiIG9mZnNldD0iMCUiPjwvc3RvcD4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzREQjM4RSIgb2Zmc2V0PSIxMDAlIj48L3N0b3A+CiAgICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgICAgICA8cmVjdCBpZD0icGF0aC0yIiB4PSI0MiIgeT0iMTY3IiB3aWR0aD0iMTY4IiBoZWlnaHQ9IjI3IiByeD0iMTMuNSI+PC9yZWN0PgogICAgICAgIDxmaWx0ZXIgeD0iLTkuNSUiIHk9Ii0yOS42JSIgd2lkdGg9IjExOS4wJSIgaGVpZ2h0PSIyMTguNSUiIGZpbHRlclVuaXRzPSJvYmplY3RCb3VuZGluZ0JveCIgaWQ9ImZpbHRlci0zIj4KICAgICAgICAgICAgPGZlT2Zmc2V0IGR4PSIwIiBkeT0iOCIgaW49IlNvdXJjZUFscGhhIiByZXN1bHQ9InNoYWRvd09mZnNldE91dGVyMSI+PC9mZU9mZnNldD4KICAgICAgICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iNCIgaW49InNoYWRvd09mZnNldE91dGVyMSIgcmVzdWx0PSJzaGFkb3dCbHVyT3V0ZXIxIj48L2ZlR2F1c3NpYW5CbHVyPgogICAgICAgICAgICA8ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMCAgIDAgMCAwIDAgMCAgIDAgMCAwIDAgMCAgMCAwIDAgMC4wNTY4MTgxODE4IDAiIHR5cGU9Im1hdHJpeCIgaW49InNoYWRvd0JsdXJPdXRlcjEiPjwvZmVDb2xvck1hdHJpeD4KICAgICAgICA8L2ZpbHRlcj4KICAgICAgICA8cmVjdCBpZD0icGF0aC00IiB4PSI0MSIgeT0iMTEwIiB3aWR0aD0iMTQyIiBoZWlnaHQ9IjI1IiByeD0iMTIuNSI+PC9yZWN0PgogICAgICAgIDxmaWx0ZXIgeD0iLTExLjMlIiB5PSItMzIuMCUiIHdpZHRoPSIxMjIuNSUiIGhlaWdodD0iMjI4LjAlIiBmaWx0ZXJVbml0cz0ib2JqZWN0Qm91bmRpbmdCb3giIGlkPSJmaWx0ZXItNSI+CiAgICAgICAgICAgIDxmZU9mZnNldCBkeD0iMCIgZHk9IjgiIGluPSJTb3VyY2VBbHBoYSIgcmVzdWx0PSJzaGFkb3dPZmZzZXRPdXRlcjEiPjwvZmVPZmZzZXQ+CiAgICAgICAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjQiIGluPSJzaGFkb3dPZmZzZXRPdXRlcjEiIHJlc3VsdD0ic2hhZG93Qmx1ck91dGVyMSI+PC9mZUdhdXNzaWFuQmx1cj4KICAgICAgICAgICAgPGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAgICAwIDAgMCAwIDAgICAwIDAgMCAwIDAgIDAgMCAwIDAuMDU2ODE4MTgxOCAwIiB0eXBlPSJtYXRyaXgiIGluPSJzaGFkb3dCbHVyT3V0ZXIxIj48L2ZlQ29sb3JNYXRyaXg+CiAgICAgICAgPC9maWx0ZXI+CiAgICAgICAgPHJlY3QgaWQ9InBhdGgtNiIgeD0iNDEiIHk9IjIyNiIgd2lkdGg9IjEwNSIgaGVpZ2h0PSIyNSIgcng9IjEyLjUiPjwvcmVjdD4KICAgICAgICA8ZmlsdGVyIHg9Ii0xNS4yJSIgeT0iLTMyLjAlIiB3aWR0aD0iMTMwLjUlIiBoZWlnaHQ9IjIyOC4wJSIgZmlsdGVyVW5pdHM9Im9iamVjdEJvdW5kaW5nQm94IiBpZD0iZmlsdGVyLTciPgogICAgICAgICAgICA8ZmVPZmZzZXQgZHg9IjAiIGR5PSI4IiBpbj0iU291cmNlQWxwaGEiIHJlc3VsdD0ic2hhZG93T2Zmc2V0T3V0ZXIxIj48L2ZlT2Zmc2V0PgogICAgICAgICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSI0IiBpbj0ic2hhZG93T2Zmc2V0T3V0ZXIxIiByZXN1bHQ9InNoYWRvd0JsdXJPdXRlcjEiPjwvZmVHYXVzc2lhbkJsdXI+CiAgICAgICAgICAgIDxmZUNvbG9yTWF0cml4IHZhbHVlcz0iMCAwIDAgMCAwICAgMCAwIDAgMCAwICAgMCAwIDAgMCAwICAwIDAgMCAwLjA1NjgxODE4MTggMCIgdHlwZT0ibWF0cml4IiBpbj0ic2hhZG93Qmx1ck91dGVyMSI+PC9mZUNvbG9yTWF0cml4PgogICAgICAgIDwvZmlsdGVyPgogICAgPC9kZWZzPgogICAgPGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9Ikdyb3VwLTUtQ29weS0yIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDE1LjAwMDAwMCwgLTM1MS4wMDAwMDApIj4KICAgICAgICAgICAgPGcgaWQ9Ikdyb3VwLTEwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0MTUuMDAwMDAwLCAzNTEuMDAwMDAwKSI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iR3JvdXAtOSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDE1LjAwMDAwMCkiPgogICAgICAgICAgICAgICAgICAgIDxyZWN0IGlkPSJSZWN0YW5nbGUtQ29weS01NCIgZmlsbD0idXJsKCNsaW5lYXJHcmFkaWVudC0xKSIgeD0iMCIgeT0iMCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSIzNDAiIHJ4PSI3MCI+PC9yZWN0PgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMzcuNjEyMjE0LDEzOC4xNTc2NTQgQzIzNC43MjU3ODMsMTM1LjI4MTkyIDIzMC4wNTEyNTQsMTM1LjI3OTY0NCAyMjcuMTY0ODIzLDEzOC4xNTc2NTQgQzIyNC4yNzgzOTIsMTQxLjAzNTY2MyAyMjQuMjc4MzkyLDE0NS42OTg4MzEgMjI3LjE2NDgyMywxNDguNTc2ODQgQzIzNC45Mzk4OCwxNTYuMzI5MjE0IDIzOS4yMjI3MzUsMTY2LjYwMTM4MiAyMzkuMjIyNzM1LDE3Ny40OTk0MDMgQzIzOS4yMjI3MzUsMTg4LjM5NzQyMyAyMzQuOTM5ODgsMTk4LjY2OTU5MSAyMjcuMTY0ODIzLDIwNi40MjQ2OTYgQzIyNC4yNzgzOTIsMjA5LjMwMDQzIDIyNC4yNzgzOTIsMjEzLjk2NTg3MyAyMjcuMTY0ODIzLDIxNi44NDE2MDcgQzIyOC42MDgyNjcsMjE4LjI4MDM4NCAyMzAuNDk3MjUxLDIxOSAyMzIuMzg4NTE4LDIxOSBDMjM0LjI3NzUwMywyMTkgMjM2LjE2ODc3LDIxOC4yODAzODQgMjM3LjYxMjIxNCwyMTYuODQxNjA3IEMyNDguMTgwMTIsMjA2LjMwNDUzMiAyNTQsMTkyLjMzNDE0NyAyNTQsMTc3LjQ5OTQwMyBDMjU0LDE2Mi42NjUxMTQgMjQ4LjE4MDEyLDE0OC42OTQ3MjggMjM3LjYxMjIxNCwxMzguMTU3NjU0IFoiIGlkPSJQYXRoLUNvcHktMjYiIGZpbGwtb3BhY2l0eT0iMC4yMDA0ODIiIGZpbGw9IiMwMDAwMDAiIGZpbGwtcnVsZT0ibm9uemVybyIgb3BhY2l0eT0iMC43NTQwNjUyMjUiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMjY3LjMzMzAyNiwxMTMuMTU4NjYxIEMyNjQuNTEwNDksMTEwLjI4MDQ0NiAyNTkuOTM5NDM4LDExMC4yODA0NDYgMjU3LjExNjkwMiwxMTMuMTU4NjYxIEMyNTQuMjk0MzY2LDExNi4wMzkxNTQgMjU0LjI5NDM2NiwxMjAuNzA5MDc4IDI1Ny4xMTY5MDIsMTIzLjU4NjgzNyBDMjg1LjcwMzgzNywxNTIuNzYzMDQyIDI4NS43MDM4MzcsMjAwLjIzNzY0MSAyNTcuMTE2OTAyLDIyOS40MTM4NDcgQzI1NC4yOTQzNjYsMjMyLjI5MjA2MSAyNTQuMjk0MzY2LDIzNi45NjE1MyAyNTcuMTE2OTAyLDIzOS44Mzk3NDQgQzI1OC41MjgzOTMsMjQxLjI4MDIxOSAyNjAuMzc1NTYyLDI0MiAyNjIuMjI0OTY0LDI0MiBDMjY0LjA3NDM2NSwyNDIgMjY1LjkyMTUzNSwyNDEuMjc5NzYzIDI2Ny4zMzMwMjYsMjM5LjgzNzAxMSBDMzAxLjU1NTY1OCwyMDQuOTEyNTc2IDMwMS41NTU2NTgsMTQ4LjA4NDAwNyAyNjcuMzMzMDI2LDExMy4xNTg2NjEgWiIgaWQ9IlBhdGgtQ29weS0yNyIgZmlsbC1vcGFjaXR5PSIwLjI1MDU2NSIgZmlsbD0iIzEzMTUxNCIgZmlsbC1ydWxlPSJub256ZXJvIiBvcGFjaXR5PSIwLjc1NDA2NTIyNSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxnIGlkPSJSZWN0YW5nbGUtQ29weS01NSI+CiAgICAgICAgICAgICAgICAgICAgICAgIDx1c2UgZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMSIgZmlsdGVyPSJ1cmwoI2ZpbHRlci0zKSIgeGxpbms6aHJlZj0iI3BhdGgtMiI+PC91c2U+CiAgICAgICAgICAgICAgICAgICAgICAgIDx1c2UgZmlsbD0iI0ZGRkZGRiIgZmlsbC1ydWxlPSJldmVub2RkIiB4bGluazpocmVmPSIjcGF0aC0yIj48L3VzZT4KICAgICAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9IlJlY3RhbmdsZS1Db3B5LTU2Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSBmaWxsPSJibGFjayIgZmlsbC1vcGFjaXR5PSIxIiBmaWx0ZXI9InVybCgjZmlsdGVyLTUpIiB4bGluazpocmVmPSIjcGF0aC00Ij48L3VzZT4KICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHhsaW5rOmhyZWY9IiNwYXRoLTQiPjwvdXNlPgogICAgICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgICAgICA8ZyBpZD0iUmVjdGFuZ2xlLUNvcHktNTciPgogICAgICAgICAgICAgICAgICAgICAgICA8dXNlIGZpbGw9ImJsYWNrIiBmaWxsLW9wYWNpdHk9IjEiIGZpbHRlcj0idXJsKCNmaWx0ZXItNykiIHhsaW5rOmhyZWY9IiNwYXRoLTYiPjwvdXNlPgogICAgICAgICAgICAgICAgICAgICAgICA8dXNlIGZpbGw9IiNGRkZGRkYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgeGxpbms6aHJlZj0iI3BhdGgtNiI+PC91c2U+CiAgICAgICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTUwOS45NzUsMjk5LjEzIEM1MjEuOTcxNjY3LDI5OS4xMyA1MzIuNjksMjk3LjA2NSA1NDIuMTMsMjkyLjkzNSBDNTUxLjU3LDI4OC44MDUgNTU5LjMzODMzMywyODMuNjQyNSA1NjUuNDM1LDI3Ny40NDc1IEM1NzEuNTMxNjY3LDI3MS4yNTI1IDU3NS45NTY2NjcsMjY0LjgxMTY2NyA1NzguNzEsMjU4LjEyNSBMNTQyLjQyNSwyNDYuOTE1IEM1MzUuMzQ1LDI1OS44OTUgNTI0LjYyNjY2NywyNjYuMzg1IDUxMC4yNywyNjYuMzg1IEM1MDIuMDEsMjY2LjM4NSA0OTQuOTc5MTY3LDI2NC42NjQxNjcgNDg5LjE3NzUsMjYxLjIyMjUgQzQ4My4zNzU4MzMsMjU3Ljc4MDgzMyA0NzkuMDQ5MTY3LDI1My42MDE2NjcgNDc2LjE5NzUsMjQ4LjY4NSBDNDczLjM0NTgzMywyNDMuNzY4MzMzIDQ3MS45MiwyMzkuMDQ4MzMzIDQ3MS45MiwyMzQuNTI1IEw1ODEuOTU1LDIzMy4zNDUgQzU4Mi4xNTE2NjcsMjMxLjE4MTY2NyA1ODIuMjUsMjI3LjkzNjY2NyA1ODIuMjUsMjIzLjYxIEM1ODIuMjUsMjA1LjkxIDU3OC44NTc1LDE5MS4yNTgzMzMgNTcyLjA3MjUsMTc5LjY1NSBDNTY1LjI4NzUsMTY4LjA1MTY2NyA1NTYuMzg4MzMzLDE1OS41OTUgNTQ1LjM3NSwxNTQuMjg1IEM1MzQuMzYxNjY3LDE0OC45NzUgNTIyLjM2NSwxNDYuMzIgNTA5LjM4NSwxNDYuMzIgQzQ5NS42MTgzMzMsMTQ2LjMyIDQ4Mi44ODQxNjcsMTQ5LjEyMjUgNDcxLjE4MjUsMTU0LjcyNzUgQzQ1OS40ODA4MzMsMTYwLjMzMjUgNDQ5Ljk5MTY2NywxNjguOTM2NjY3IDQ0Mi43MTUsMTgwLjU0IEM0MzUuNDM4MzMzLDE5Mi4xNDMzMzMgNDMxLjgsMjA2LjMwMzMzMyA0MzEuOCwyMjMuMDIgQzQzMS44LDIzNi45ODMzMzMgNDM1LjA0NSwyNDkuNzY2NjY3IDQ0MS41MzUsMjYxLjM3IEM0NDguMDI1LDI3Mi45NzMzMzMgNDU3LjIxOTE2NywyODIuMTY3NSA0NjkuMTE3NSwyODguOTUyNSBDNDgxLjAxNTgzMywyOTUuNzM3NSA0OTQuNjM1LDI5OS4xMyA1MDkuOTc1LDI5OS4xMyBaIE00NzEuOTIsMjA1LjMyIEM0NzIuNzA2NjY3LDE5Ny40NTMzMzMgNDc2LjI5NTgzMywxOTAuOTYzMzMzIDQ4Mi42ODc1LDE4NS44NSBDNDg5LjA3OTE2NywxODAuNzM2NjY3IDQ5Ni4wMTE2NjcsMTc3Ljk4MzMzMyA1MDMuNDg1LDE3Ny41OSBDNTEwLjc2MTY2NywxNzcuMTk2NjY3IDUxNy4zMDA4MzMsMTc4LjI3ODMzMyA1MjMuMTAyNSwxODAuODM1IEM1MjguOTA0MTY3LDE4My4zOTE2NjcgNTMzLjM3ODMzMywxODYuODgyNSA1MzYuNTI1LDE5MS4zMDc1IEM1MzkuNjcxNjY3LDE5NS43MzI1IDU0MS4yNDUsMjAwLjMwNSA1NDEuMjQ1LDIwNS4wMjUgTDQ3MS45MiwyMDUuMzIgWiBNNjY5Ljk1NSwyOTkuMTMgQzY3My44ODgzMzMsMjk5LjEzIDY3Ny42NzQxNjcsMjk4LjczNjY2NyA2ODEuMzEyNSwyOTcuOTUgQzY4NC45NTA4MzMsMjk3LjE2MzMzMyA2ODguNTg5MTY3LDI5Ni4wODE2NjcgNjkyLjIyNzUsMjk0LjcwNSBDNjk1Ljg2NTgzMywyOTMuMzI4MzMzIDY5OC4xNzY2NjcsMjkyLjQ0MzMzMyA2OTkuMTYsMjkyLjA1IEw2OTkuMTYsMjkyLjA1IEw2ODguMjQ1LDI1OC40MiBDNjg0LjUwODMzMywyNjAuNzggNjgwLjA4MzMzMywyNjEuOTYgNjc0Ljk3LDI2MS45NiBDNjY5LjQ2MzMzMywyNjEuOTYgNjY1LjMzMzMzMywyNjAuMjg4MzMzIDY2Mi41OCwyNTYuOTQ1IEM2NjAuNjEzMzMzLDI1NC41ODUgNjU5LjMzNSwyNTEuNjg0MTY3IDY1OC43NDUsMjQ4LjI0MjUgQzY1OC4xNTUsMjQ0LjgwMDgzMyA2NTcuODYsMjM3Ljk2NjY2NyA2NTcuODYsMjI3Ljc0IEw2NTcuODYsMjI3Ljc0IEw2NTcuODYsMTg0LjY3IEw2OTIuNjcsMTg0LjY3IEw2OTIuNjcsMTUwLjc0NSBMNjU4LjE1NSwxNTAuNzQ1IEw2NTguMTU1LDEwNy4wODUgTDYyMC42OSwxMDcuMDg1IEw2MjAuNjksMTQxLjAxIEM2MjAuNjksMTQ0LjU1IDYxOS45MDMzMzMsMTQ3LjA1NzUgNjE4LjMzLDE0OC41MzI1IEM2MTYuNzU2NjY3LDE1MC4wMDc1IDYxMy44MDY2NjcsMTUwLjc0NSA2MDkuNDgsMTUwLjc0NSBMNjA5LjQ4LDE1MC43NDUgTDU5My41NSwxNTAuNzQ1IEw1OTMuNTUsMTg0LjY3IEw2MTguOTIsMTg0LjY3IEw2MTguOTIsMjUyLjIyNSBDNjE4LjkyLDI2Mi4wNTgzMzMgNjIxLjkxOTE2NywyNzEuNDk4MzMzIDYyNy45MTc1LDI4MC41NDUgQzYzMy45MTU4MzMsMjg5LjU5MTY2NyA2NDMuMDExNjY3LDI5NS4yOTUgNjU1LjIwNSwyOTcuNjU1IEM2NTkuOTI1LDI5OC42MzgzMzMgNjY0Ljg0MTY2NywyOTkuMTMgNjY5Ljk1NSwyOTkuMTMgWiBNNzY0LjQ0NSwyOTYuNDc1IEw3NjQuNDQ1LDIxMy44NzUgQzc2NC40NDUsMjAyLjY2NSA3NjcuMzk1LDE5NC41NTI1IDc3My4yOTUsMTg5LjUzNzUgQzc3OS4xOTUsMTg0LjUyMjUgNzg1LjU4NjY2NywxODIuMDE1IDc5Mi40NywxODIuMDE1IEM3OTkuNTUsMTgyLjAxNSA4MDUuNzQ1LDE4NC4zMjU4MzMgODExLjA1NSwxODguOTQ3NSBDODE2LjM2NSwxOTMuNTY5MTY3IDgxOS4wMiwyMDEuODc4MzMzIDgxOS4wMiwyMTMuODc1IEw4MTkuMDIsMjEzLjg3NSBMODE5LjAyLDI5Ni40NzUgTDg2MS41LDI5Ni40NzUgTDg2MS41LDIwOC41NjUgQzg2MS41LDE5Mi40MzgzMzMgODU3LjUxNzUsMTc4LjEzMDgzMyA4NDkuNTUyNSwxNjUuNjQyNSBDODQxLjU4NzUsMTUzLjE1NDE2NyA4MjYuOTg1LDE0Ni45MSA4MDUuNzQ1LDE0Ni45MSBDNzk5LjI1NSwxNDYuOTEgNzkzLjEwOTE2NywxNDcuOTQyNSA3ODcuMzA3NSwxNTAuMDA3NSBDNzgxLjUwNTgzMywxNTIuMDcyNSA3NzYuNjM4MzMzLDE1NC41MzA4MzMgNzcyLjcwNSwxNTcuMzgyNSBDNzY4Ljc3MTY2NywxNjAuMjM0MTY3IDc2Ni4zMTMzMzMsMTYyLjc0MTY2NyA3NjUuMzMsMTY0LjkwNSBMNzY1LjMzLDE2NC45MDUgTDc2NS4zMyw4MS40MiBMNzIyLjI2LDgxLjEyNSBMNzIyLjU1NSwyOTYuNDc1IEw3NjQuNDQ1LDI5Ni40NzUgWiBNOTU5LjgyNSwyOTkuMTMgQzk3MS44MjE2NjcsMjk5LjEzIDk4Mi41NCwyOTcuMDY1IDk5MS45OCwyOTIuOTM1IEMxMDAxLjQyLDI4OC44MDUgMTAwOS4xODgzMywyODMuNjQyNSAxMDE1LjI4NSwyNzcuNDQ3NSBDMTAyMS4zODE2NywyNzEuMjUyNSAxMDI1LjgwNjY3LDI2NC44MTE2NjcgMTAyOC41NiwyNTguMTI1IEw5OTIuMjc1LDI0Ni45MTUgQzk4NS4xOTUsMjU5Ljg5NSA5NzQuNDc2NjY3LDI2Ni4zODUgOTYwLjEyLDI2Ni4zODUgQzk1MS44NiwyNjYuMzg1IDk0NC44MjkxNjcsMjY0LjY2NDE2NyA5MzkuMDI3NSwyNjEuMjIyNSBDOTMzLjIyNTgzMywyNTcuNzgwODMzIDkyOC44OTkxNjcsMjUzLjYwMTY2NyA5MjYuMDQ3NSwyNDguNjg1IEM5MjMuMTk1ODMzLDI0My43NjgzMzMgOTIxLjc3LDIzOS4wNDgzMzMgOTIxLjc3LDIzNC41MjUgTDEwMzEuODA1LDIzMy4zNDUgQzEwMzIuMDAxNjcsMjMxLjE4MTY2NyAxMDMyLjEsMjI3LjkzNjY2NyAxMDMyLjEsMjIzLjYxIEMxMDMyLjEsMjA1LjkxIDEwMjguNzA3NSwxOTEuMjU4MzMzIDEwMjEuOTIyNSwxNzkuNjU1IEMxMDE1LjEzNzUsMTY4LjA1MTY2NyAxMDA2LjIzODMzLDE1OS41OTUgOTk1LjIyNSwxNTQuMjg1IEM5ODQuMjExNjY3LDE0OC45NzUgOTcyLjIxNSwxNDYuMzIgOTU5LjIzNSwxNDYuMzIgQzk0NS40NjgzMzMsMTQ2LjMyIDkzMi43MzQxNjcsMTQ5LjEyMjUgOTIxLjAzMjUsMTU0LjcyNzUgQzkwOS4zMzA4MzMsMTYwLjMzMjUgODk5Ljg0MTY2NywxNjguOTM2NjY3IDg5Mi41NjUsMTgwLjU0IEM4ODUuMjg4MzMzLDE5Mi4xNDMzMzMgODgxLjY1LDIwNi4zMDMzMzMgODgxLjY1LDIyMy4wMiBDODgxLjY1LDIzNi45ODMzMzMgODg0Ljg5NSwyNDkuNzY2NjY3IDg5MS4zODUsMjYxLjM3IEM4OTcuODc1LDI3Mi45NzMzMzMgOTA3LjA2OTE2NywyODIuMTY3NSA5MTguOTY3NSwyODguOTUyNSBDOTMwLjg2NTgzMywyOTUuNzM3NSA5NDQuNDg1LDI5OS4xMyA5NTkuODI1LDI5OS4xMyBaIE05MjEuNzcsMjA1LjMyIEM5MjIuNTU2NjY3LDE5Ny40NTMzMzMgOTI2LjE0NTgzMywxOTAuOTYzMzMzIDkzMi41Mzc1LDE4NS44NSBDOTM4LjkyOTE2NywxODAuNzM2NjY3IDk0NS44NjE2NjcsMTc3Ljk4MzMzMyA5NTMuMzM1LDE3Ny41OSBDOTYwLjYxMTY2NywxNzcuMTk2NjY3IDk2Ny4xNTA4MzMsMTc4LjI3ODMzMyA5NzIuOTUyNSwxODAuODM1IEM5NzguNzU0MTY3LDE4My4zOTE2NjcgOTgzLjIyODMzMywxODYuODgyNSA5ODYuMzc1LDE5MS4zMDc1IEM5ODkuNTIxNjY3LDE5NS43MzI1IDk5MS4wOTUsMjAwLjMwNSA5OTEuMDk1LDIwNS4wMjUgTDkyMS43NywyMDUuMzIgWiBNMTA5My41NSwyOTYuMTggTDEwOTMuNTUsMjUxLjkzIEMxMDkzLjU1LDIzOC41NTY2NjcgMTA5My44NDUsMjI4LjQ3NzUgMTA5NC40MzUsMjIxLjY5MjUgQzEwOTUuMDI1LDIxNC45MDc1IDEwOTYuMTA2NjcsMjA5LjQ5OTE2NyAxMDk3LjY4LDIwNS40Njc1IEMxMDk5LjI1MzMzLDIwMS40MzU4MzMgMTEwMS44MSwxOTcuNDUzMzMzIDExMDUuMzUsMTkzLjUyIEMxMTExLjI1LDE4Ni44MzMzMzMgMTExOS40MTE2NywxODMuNDkgMTEyOS44MzUsMTgzLjQ5IEMxMTM2LjMyNSwxODMuNDkgMTE0Mi4zMjMzMywxODQuNzY4MzMzIDExNDcuODMsMTg3LjMyNSBMMTE1OC40NSwxNTIuMjIgQzExNTIuNTUsMTQ4LjY4IDExNDQuNzgxNjcsMTQ2LjkxIDExMzUuMTQ1LDE0Ni45MSBDMTEyOS4yNDUsMTQ2LjkxIDExMjQuMTMxNjcsMTQ3LjY5NjY2NyAxMTE5LjgwNSwxNDkuMjcgQzExMTIuNzI1LDE1MS44MjY2NjcgMTEwNy4xNjkxNywxNTQuOTczMzMzIDExMDMuMTM3NSwxNTguNzEgQzEwOTkuMTA1ODMsMTYyLjQ0NjY2NyAxMDk1LjkxLDE2Ny4yNjUgMTA5My41NSwxNzMuMTY1IEwxMDkzLjU1LDE1MS42MyBMMTA1NS4yLDE1MS42MyBMMTA1NS4yLDI5NS44ODUgTDEwOTMuNTUsMjk2LjE4IFogTTExNjQuNDQsMzUzLjQxIEwxMjAzLjA4NSwzNTMuMTE1IEwxMjAyLjc5LDI4My40OTUgQzEyMTMuODAzMzMsMjk0LjcwNSAxMjI3LjQ3MTY3LDMwMC4zMSAxMjQzLjc5NSwzMDAuMzEgQzEyNTQuNDE1LDMwMC4zMSAxMjY1LjA4NDE3LDI5Ny43MDQxNjcgMTI3NS44MDI1LDI5Mi40OTI1IEMxMjg2LjUyMDgzLDI4Ny4yODA4MzMgMTI5NS41MTgzMywyNzguODI0MTY3IDEzMDIuNzk1LDI2Ny4xMjI1IEMxMzEwLjA3MTY3LDI1NS40MjA4MzMgMTMxMy43MSwyNDAuNTIzMzMzIDEzMTMuNzEsMjIyLjQzIEMxMzEzLjcxLDIwNi42OTY2NjcgMTMxMC4zMTc1LDE5Mi45NzkxNjcgMTMwMy41MzI1LDE4MS4yNzc1IEMxMjk2Ljc0NzUsMTY5LjU3NTgzMyAxMjg4LjA5NDE3LDE2MC42NzY2NjcgMTI3Ny41NzI1LDE1NC41OCBDMTI2Ny4wNTA4MywxNDguNDgzMzMzIDEyNTYuNDgsMTQ1LjQzNSAxMjQ1Ljg2LDE0NS40MzUgQzEyMjYuMTkzMzMsMTQ1LjQzNSAxMjExLjY0LDE1Mi4yMiAxMjAyLjIsMTY1Ljc5IEwxMjAyLjIsMTY1Ljc5IEwxMjAwLjcyNSwxNTAuNDUgTDExNjMuODUsMTUwLjE1NSBMMTE2NC40NCwzNTMuNDEgWiBNMTIzOS4wNzUsMjY0LjkxIEMxMjI3LjQ3MTY3LDI2NC45MSAxMjE4LjQyNSwyNjEuMDI1ODMzIDEyMTEuOTM1LDI1My4yNTc1IEMxMjA1LjQ0NSwyNDUuNDg5MTY3IDEyMDIuMiwyMzUuNTA4MzMzIDEyMDIuMiwyMjMuMzE1IEMxMjAyLjIsMjEyLjY5NSAxMjA1LjA1MTY3LDIwMy4xNTY2NjcgMTIxMC43NTUsMTk0LjcgQzEyMTYuNDU4MzMsMTg2LjI0MzMzMyAxMjI1LjgsMTgyLjAxNSAxMjM4Ljc4LDE4Mi4wMTUgQzEyNDUuNjYzMzMsMTgyLjAxNSAxMjUxLjg1ODMzLDE4My44ODMzMzMgMTI1Ny4zNjUsMTg3LjYyIEMxMjYyLjg3MTY3LDE5MS4zNTY2NjcgMTI2Ny4xOTgzMywxOTYuMzcxNjY3IDEyNzAuMzQ1LDIwMi42NjUgQzEyNzMuNDkxNjcsMjA4Ljk1ODMzMyAxMjc1LjA2NSwyMTUuNzQzMzMzIDEyNzUuMDY1LDIyMy4wMiBDMTI3NS4wNjUsMjMwLjg4NjY2NyAxMjczLjQ0MjUsMjM4LjAxNTgzMyAxMjcwLjE5NzUsMjQ0LjQwNzUgQzEyNjYuOTUyNSwyNTAuNzk5MTY3IDEyNjIuNTc2NjcsMjU1LjgxNDE2NyAxMjU3LjA3LDI1OS40NTI1IEMxMjUxLjU2MzMzLDI2My4wOTA4MzMgMTI0NS41NjUsMjY0LjkxIDEyMzkuMDc1LDI2NC45MSBaIE0xMzg2LjA3NSwzMDAuOSBDMTM5NS43MTE2NywzMDAuOSAxNDAzLjkyMjUsMjk4Ljc4NTgzMyAxNDEwLjcwNzUsMjk0LjU1NzUgQzE0MTcuNDkyNSwyOTAuMzI5MTY3IDE0MjIuOTUsMjg1LjM2MzMzMyAxNDI3LjA4LDI3OS42NiBMMTQyNy4wOCwyNzkuNjYgTDE0MjguMjYsMjk2LjQ3NSBMMTQ2Ni45MDUsMjk2LjQ3NSBMMTQ2Ni4wMiwxOTkuNzE1IEMxNDY2LjAyLDE4OC44OTgzMzMgMTQ2Mi44NzMzMywxNzkuMTYzMzMzIDE0NTYuNTgsMTcwLjUxIEMxNDUwLjI4NjY3LDE2MS44NTY2NjcgMTQ0MC42NSwxNTUuMDcxNjY3IDE0MjcuNjcsMTUwLjE1NSBDMTQxOS40MSwxNDcuMjA1IDE0MTAuODU1LDE0NS43MyAxNDAyLjAwNSwxNDUuNzMgQzEzODkuMDI1LDE0NS43MyAxMzc3LjUyLDE0OC40ODMzMzMgMTM2Ny40OSwxNTMuOTkgQzEzNTcuODUzMzMsMTU5LjQ5NjY2NyAxMzUwLjU3NjY3LDE2NS43NDA4MzMgMTM0NS42NiwxNzIuNzIyNSBDMTM0MC43NDMzMywxNzkuNzA0MTY3IDEzMzcuNjk1LDE4Ni43MzUgMTMzNi41MTUsMTkzLjgxNSBMMTMzNi41MTUsMTkzLjgxNSBMMTM3MS4wMywyMDEuMTkgQzEzNzIuNDA2NjcsMTkzLjUyIDEzNzUuNDU1LDE4Ny42NjkxNjcgMTM4MC4xNzUsMTgzLjYzNzUgQzEzODQuODk1LDE3OS42MDU4MzMgMTM5MC43OTUsMTc3LjU5IDEzOTcuODc1LDE3Ny41OSBDMTQwMC42MjgzMywxNzcuNTkgMTQwMy45NzE2NywxNzguMDgxNjY3IDE0MDcuOTA1LDE3OS4wNjUgQzE0MTMuNjA4MzMsMTgwLjYzODMzMyAxNDE3LjY4OTE3LDE4Mi45NDkxNjcgMTQyMC4xNDc1LDE4NS45OTc1IEMxNDIyLjYwNTgzLDE4OS4wNDU4MzMgMTQyMy44MzUsMTkyLjM0IDE0MjMuODM1LDE5NS44OCBDMTQyMy44MzUsMTk3LjY1IDE0MjMuNTQsMTk5LjM3MDgzMyAxNDIyLjk1LDIwMS4wNDI1IEMxNDIyLjM2LDIwMi43MTQxNjcgMTQyMS42NzE2NywyMDMuODQ1IDE0MjAuODg1LDIwNC40MzUgQzE0MTkuNTA4MzMsMjA1LjYxNSAxNDE2LjcwNTgzLDIwNi41OTgzMzMgMTQxMi40Nzc1LDIwNy4zODUgQzE0MDguMjQ5MTcsMjA4LjE3MTY2NyAxNDAyLjMsMjA5LjA1NjY2NyAxMzk0LjYzLDIxMC4wNCBMMTM5NC42MywyMTAuMDQgTDEzODUuMTksMjExLjIyIEMxMzY5LjI2LDIxMy4xODY2NjcgMTM1Ni43MjI1LDIxNy44MDgzMzMgMTM0Ny41Nzc1LDIyNS4wODUgQzEzMzguNDMyNSwyMzIuMzYxNjY3IDEzMzMuODYsMjQyLjY4NjY2NyAxMzMzLjg2LDI1Ni4wNiBDMTMzMy44NiwyNTguNjE2NjY3IDEzMzMuOTU4MzMsMjYwLjU4MzMzMyAxMzM0LjE1NSwyNjEuOTYgQzEzMzUuNzI4MzMsMjc0LjE1MzMzMyAxMzQwLjk0LDI4My42OTE2NjcgMTM0OS43OSwyOTAuNTc1IEMxMzU4LjY0LDI5Ny40NTgzMzMgMTM3MC43MzUsMzAwLjkgMTM4Ni4wNzUsMzAwLjkgWiBNMTM5My4xNTUsMjcxLjEwNSBDMTM4Ni44NjE2NywyNzEuMTA1IDEzODEuODk1ODMsMjY5LjYzIDEzNzguMjU3NSwyNjYuNjggQzEzNzQuNjE5MTcsMjYzLjczIDEzNzIuOCwyNTkuNTAxNjY3IDEzNzIuOCwyNTMuOTk1IEMxMzcyLjgsMjQ5LjY2ODMzMyAxMzczLjkzMDgzLDI0Ni40MjMzMzMgMTM3Ni4xOTI1LDI0NC4yNiBDMTM3OC40NTQxNywyNDIuMDk2NjY3IDEzODEuNTAyNSwyNDAuNzIgMTM4NS4zMzc1LDI0MC4xMyBDMTM4OS4xNzI1LDIzOS41NCAxMzk0LjgyNjY3LDIzOS4wNDgzMzMgMTQwMi4zLDIzOC42NTUgQzE0MDQuMjY2NjcsMjM4LjQ1ODMzMyAxNDA3Ljg1NTgzLDIzOC4yMTI1IDE0MTMuMDY3NSwyMzcuOTE3NSBDMTQxOC4yNzkxNywyMzcuNjIyNSAxNDIzLjE0NjY3LDIzNy4wODE2NjcgMTQyNy42NywyMzYuMjk1IEMxNDI3Ljg2NjY3LDIzNy4yNzgzMzMgMTQyNy45NjUsMjM4Ljc1MzMzMyAxNDI3Ljk2NSwyNDAuNzIgQzE0MjcuOTY1LDI0Ny44IDE0MjUuODAxNjcsMjUzLjk5NSAxNDIxLjQ3NSwyNTkuMzA1IEMxNDE3LjE0ODMzLDI2NC42MTUgMTQxMC45NTMzMywyNjguMTU1IDE0MDIuODksMjY5LjkyNSBDMTM5OC4xNywyNzAuNzExNjY3IDEzOTQuOTI1LDI3MS4xMDUgMTM5My4xNTUsMjcxLjEwNSBaIE0xNTU3Ljg1NSwzMDEuMTk1IEMxNTc3LjUyMTY3LDMwMS4xOTUgMTU5Mi4wNzUsMjk0LjQxIDE2MDEuNTE1LDI4MC44NCBMMTYwMS41MTUsMjgwLjg0IEwxNjAyLjk5LDI5Ni4xOCBMMTYzOS44NjUsMjk2LjQ3NSBMMTYzOS4yNzUsODEuMTI1IEwxNjAwLjYzLDgxLjQyIEwxNjAwLjkyNSwxNjMuMTM1IEMxNTg5LjkxMTY3LDE1MS45MjUgMTU3Ni4yNDMzMywxNDYuMzIgMTU1OS45MiwxNDYuMzIgQzE1NDkuMywxNDYuMzIgMTUzOC42MzA4MywxNDguOTI1ODMzIDE1MjcuOTEyNSwxNTQuMTM3NSBDMTUxNy4xOTQxNywxNTkuMzQ5MTY3IDE1MDguMTk2NjcsMTY3LjgwNTgzMyAxNTAwLjkyLDE3OS41MDc1IEMxNDkzLjY0MzMzLDE5MS4yMDkxNjcgMTQ5MC4wMDUsMjA2LjEwNjY2NyAxNDkwLjAwNSwyMjQuMiBDMTQ5MC4wMDUsMjM5LjkzMzMzMyAxNDkzLjM5NzUsMjUzLjY1MDgzMyAxNTAwLjE4MjUsMjY1LjM1MjUgQzE1MDYuOTY3NSwyNzcuMDU0MTY3IDE1MTUuNjIwODMsMjg1Ljk1MzMzMyAxNTI2LjE0MjUsMjkyLjA1IEMxNTM2LjY2NDE3LDI5OC4xNDY2NjcgMTU0Ny4yMzUsMzAxLjE5NSAxNTU3Ljg1NSwzMDEuMTk1IFogTTE1NjQuOTM1LDI2NC42MTUgQzE1NTguMDUxNjcsMjY0LjYxNSAxNTUxLjg1NjY3LDI2Mi43NDY2NjcgMTU0Ni4zNSwyNTkuMDEgQzE1NDAuODQzMzMsMjU1LjI3MzMzMyAxNTM2LjUxNjY3LDI1MC4yNTgzMzMgMTUzMy4zNywyNDMuOTY1IEMxNTMwLjIyMzMzLDIzNy42NzE2NjcgMTUyOC42NSwyMzAuODg2NjY3IDE1MjguNjUsMjIzLjYxIEMxNTI4LjY1LDIxNS43NDMzMzMgMTUzMC4yNzI1LDIwOC42MTQxNjcgMTUzMy41MTc1LDIwMi4yMjI1IEMxNTM2Ljc2MjUsMTk1LjgzMDgzMyAxNTQxLjEzODMzLDE5MC44MTU4MzMgMTU0Ni42NDUsMTg3LjE3NzUgQzE1NTIuMTUxNjcsMTgzLjUzOTE2NyAxNTU4LjE1LDE4MS43MiAxNTY0LjY0LDE4MS43MiBDMTU3Ni4yNDMzMywxODEuNzIgMTU4NS4yOSwxODUuNjA0MTY3IDE1OTEuNzgsMTkzLjM3MjUgQzE1OTguMjcsMjAxLjE0MDgzMyAxNjAxLjUxNSwyMTEuMTIxNjY3IDE2MDEuNTE1LDIyMy4zMTUgQzE2MDEuNTE1LDIzMy45MzUgMTU5OC42NjMzMywyNDMuNDczMzMzIDE1OTIuOTYsMjUxLjkzIEMxNTg3LjI1NjY3LDI2MC4zODY2NjcgMTU3Ny45MTUsMjY0LjYxNSAxNTY0LjkzNSwyNjQuNjE1IFoiIGlkPSJldGhlcnBhZCIgZmlsbD0iIzQ0QjM5MiIgZmlsbC1ydWxlPSJub256ZXJvIj48L3BhdGg+CiAgICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg=="><p>world</p></body></html>',
    expectedLineAttribs: ['+5', '*0*1*2+1', '+5'],
    expectedText: ['image', '*', 'world'],
  },
  nestedLi: {
    description: 'Complex nested Li',
    html: '<!doctype html><html><body><ol><li>one</li><li><ol><li>1.1</li></ol></li><li>two</li></ol></body></html>',
    expectedLineAttribs: [
      '*0*1*2*3+1+3', '*0*4*2*5+1+3', '*0*1*2*5+1+3',
    ],
    expectedText: [
      '*one', '*1.1', '*two',
    ],
  },
  complexNest: {
    description: 'Complex list of different types',
    html: '<!doctype html><html><body><ul class="bullet"><li>one</li><li>two</li><li>0</li><li>1</li><li>2<ul class="bullet"><li>3</li><li>4</li></ul></li></ul><ol class="number"><li>item<ol class="number"><li>item1</li><li>item2</li></ol></li></ol></body></html>',
    expectedLineAttribs: [
      '*0*1*2+1+3',
      '*0*1*2+1+3',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*3*2+1+1',
      '*0*3*2+1+1',
      '*0*4*2*5+1+4',
      '*0*6*2*7+1+5',
      '*0*6*2*7+1+5',
    ],
    expectedText: [
      '*one',
      '*two',
      '*0',
      '*1',
      '*2',
      '*3',
      '*4',
      '*item',
      '*item1',
      '*item2',
    ],
  },
  ul: {
    description: 'Tests if uls properly get attributes',
    html: '<html><body><ul><li>a</li><li>b</li></ul><div>div</div><p>foo</p></body></html>',
    expectedLineAttribs: ['*0*1*2+1+1', '*0*1*2+1+1', '+3', '+3'],
    expectedText: ['*a', '*b', 'div', 'foo'],
  },
  ulIndented: {
    description: 'Tests if indented uls properly get attributes',
    html: '<html><body><ul><li>a</li><ul><li>b</li></ul><li>a</li></ul><p>foo</p></body></html>',
    expectedLineAttribs: ['*0*1*2+1+1', '*0*3*2+1+1', '*0*1*2+1+1', '+3'],
    expectedText: ['*a', '*b', '*a', 'foo'],
  },
  ol: {
    description: 'Tests if ols properly get line numbers when in a normal OL',
    html: '<html><body><ol><li>a</li><li>b</li><li>c</li></ol><p>test</p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+1', '*0*1*2*3+1+1', '*0*1*2*3+1+1', '+4'],
    expectedText: ['*a', '*b', '*c', 'test'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
  },
  lineDoBreakInOl: {
    description: 'A single completely empty line break within an ol should reset count if OL is closed off..',
    html: '<html><body><ol><li>should be 1</li></ol><p>hello</p><ol><li>should be 1</li><li>should be 2</li></ol><p></p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+b', '+5', '*0*1*2*4+1+b', '*0*1*2*4+1+b', ''],
    expectedText: ['*should be 1', 'hello', '*should be 1', '*should be 2', ''],
    noteToSelf: "Shouldn't include attribute marker in the <p> line",
  },
  bulletListInOL: {
    description: 'A bullet within an OL should not change numbering..',
    html: '<html><body><ol><li>should be 1</li><ul><li>should be a bullet</li></ul><li>should be 2</li></ol><p></p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+b', '*0*4*2*3+1+i', '*0*1*2*5+1+b', ''],
    expectedText: ['*should be 1', '*should be a bullet', '*should be 2', ''],
  },
  testP: {
    description: 'A single <p></p> should create a new line',
    html: '<html><body><p></p><p></p></body></html>',
    expectedLineAttribs: ['', ''],
    expectedText: ['', ''],
    noteToSelf: '<p></p>should create a line break but not break numbering',
  },
  nestedOl: {
    description: 'Tests if ols properly get line numbers when in a normal OL',
    html: '<html><body>a<ol><li>b<ol><li>c</li></ol></ol>notlist<p>foo</p></body></html>',
    expectedLineAttribs: ['+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1', '+7', '+3'],
    expectedText: ['a', '*b', '*c', 'notlist', 'foo'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
  },
  nestedOl2: {
    description: 'First item being an UL then subsequent being OL will fail',
    html: '<html><body><ul><li>a<ol><li>b</li><li>c</li></ol></li></ul></body></html>',
    expectedLineAttribs: ['+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1'],
    expectedText: ['a', '*b', '*c'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
    disabled: true,
  },
  lineDontBreakOL: {
    description: 'A single completely empty line break within an ol should NOT reset count',
    html: '<html><body><ol><li>should be 1</li><p></p><li>should be 2</li><li>should be 3</li></ol><p></p></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*should be 1', '*should be 2', '*should be 3'],
    noteToSelf: "<p></p>should create a line break but not break numbering -- This is what I can't get working!",
    disabled: true,
  },
  ignoreAnyTagsOutsideBody: {
    description: 'Content outside body should be ignored',
    html: '<html><head><title>title</title><style></style></head><body>empty<br></body></html>',
    expectedLineAttribs: ['+5'],
    expectedText: ['empty'],
  },
  lineWithMultipleSpaces: {
    description: 'Multiple spaces should be preserved',
    html: '<html><body>Text with  more   than    one space.<br></body></html>',
    expectedLineAttribs: [ '+10' ],
    expectedText: ['Text with  more   than    one space.']
  },
  lineWithMultipleNonBreakingAndNormalSpaces: {
    description: 'non-breaking and normal space should be preserved',
    html: '<html><body>Text&nbsp;with&nbsp; more&nbsp;&nbsp;&nbsp;than   &nbsp;one space.<br></body></html>',
    expectedLineAttribs: [ '+10' ],
    expectedText: ['Text with  more   than    one space.']
  },
  multiplenbsp: {
    description: 'Multiple nbsp should be preserved',
    html: '<html><body>&nbsp;&nbsp;<br></body></html>',
    expectedLineAttribs: [ '+2' ],
    expectedText: ['  ']
  },
  multipleNonBreakingSpaceBetweenWords: {
    description: 'Multiple nbsp between words ',
    html: '<html><body>&nbsp;&nbsp;word1&nbsp;&nbsp;word2&nbsp;&nbsp;&nbsp;word3<br></body></html>',
    expectedLineAttribs: [ '+m' ],
    expectedText: ['  word1  word2   word3']
  },
  nonBreakingSpacePreceededBySpaceBetweenWords: {
    description: 'A non-breaking space preceeded by a normal space',
    html: '<html><body> &nbsp;word1 &nbsp;word2 &nbsp;word3<br></body></html>',
    expectedLineAttribs: [ '+l' ],
    expectedText: ['  word1  word2  word3']
  },
  nonBreakingSpaceFollowededBySpaceBetweenWords: {
    description: 'A non-breaking space followed by a normal space',
    html: '<html><body>&nbsp; word1&nbsp; word2&nbsp; word3<br></body></html>',
    expectedLineAttribs: [ '+l' ],
    expectedText: ['  word1  word2  word3']
  },
  spacesAfterNewline: {
    description: 'Don\'t collapse spaces that follow a newline',
    html:'<!doctype html><html><body>something<br>             something<br></body></html>',
    expectedLineAttribs: ['+9', '+m'],
    expectedText: ['something', '             something']
  },
  spacesAfterNewlineP: {
    description: 'Don\'t collapse spaces that follow a empty paragraph',
    html:'<!doctype html><html><body>something<p></p>             something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+m'],
    expectedText: ['something', '', '             something']
  },
  spacesAtEndOfLine: {
    description: 'Don\'t collapse spaces that preceed/follow a newline',
    html:'<html><body>something            <br>             something<br></body></html>',
    expectedLineAttribs: ['+l', '+m'],
    expectedText: ['something            ', '             something']
  },
  spacesAtEndOfLineP: {
    description: 'Don\'t collapse spaces that preceed/follow a empty paragraph',
    html:'<html><body>something            <p></p>             something<br></body></html>',
    expectedLineAttribs: ['+l', '', '+m'],
    expectedText: ['something            ', '', '             something']
  },
  nonBreakingSpacesAfterNewlines: {
    description: 'Don\'t collapse non-breaking spaces that follow a newline',
    html:'<html><body>something<br>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '+c'],
    expectedText: ['something', '   something']
  },
  nonBreakingSpacesAfterNewlinesP: {
    description: 'Don\'t collapse non-breaking spaces that follow a paragraph',
    html:'<html><body>something<p></p>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+c'],
    expectedText: ['something', '', '   something']
  },
  preserveSpacesInsideElements: {
    description: 'Preserve all spaces when multiple are present',
    html: '<html><body>Need <span> more </span> space<i>  s </i> !<br></body></html>',
    expectedLineAttribs: ['+h*0+4+2'],
    expectedText: ['Need  more  space  s  !'],
  },
  preserveSpacesAcrossNewlines: {
    description: 'Newlines and multiple spaces across newlines should be preserved',
    html: `
      <html><body>Need
          <span> more </span>
          space
          <i>  s </i>
          !<br></body></html>`,
    expectedLineAttribs: [ '+19*0+4+b' ],
    expectedText: [ 'Need           more           space            s           !' ]
  },
  multipleNewLinesAtBeginning: {
    description: 'Multiple new lines at the beginning should be preserved',
    html: '<html><body><br><br><p></p><p></p>first line<br><br>second line<br></body></html>',
    expectedLineAttribs: ['', '', '', '', '+a', '', '+b'],
    expectedText: [ '', '', '', '', 'first line', '', 'second line']
  },
  multiLineParagraph:{
    description: "A paragraph with multiple lines should not loose spaces when lines are combined",
    html:`<html><body><p>
а б в г ґ д е є ж з и і ї й к л м н о
п р с т у ф х ц ч ш щ ю я ь</p>
</body></html>`,
    expectedLineAttribs: [ '+1t' ],
    expectedText: ["а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ю я ь"]
  },
  multiLineParagraphWithPre:{
    description: "lines in preformatted text should be kept intact",
    html:`<html><body><p>
а б в г ґ д е є ж з и і ї й к л м н о<pre>multiple
lines
in
pre
</pre></p><p>п р с т у ф х ц ч ш щ ю я
ь</p>
</body></html>`,
    expectedLineAttribs: [ '+11', '+8', '+5', '+2', '+3', '+r' ],
    expectedText: ['а б в г ґ д е є ж з и і ї й к л м н о', 'multiple', 'lines', 'in', 'pre', 'п р с т у ф х ц ч ш щ ю я ь']
  },
  preIntroducesASpace: {
    description: "pre should be on a new line not preceeded by a space",
    html:`<html><body><p>
    1
<pre>preline
</pre></p></body></html>`,
    expectedLineAttribs: [ '+6', '+7' ],
    expectedText: ['    1 ', 'preline']
  },
  dontDeleteSpaceInsideElements: {
    description: 'Preserve spaces on the beginning and end of a element',
    html: '<html><body>Need<span> more </span>space<i> s </i>!<br></body></html>',
    expectedLineAttribs: ['+f*0+3+1'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceOutsideElements: {
    description: 'Preserve spaces outside elements',
    html: '<html><body>Need <span>more</span> space <i>s</i> !<br></body></html>',
    expectedLineAttribs: ['+g*0+1+2'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceAtEndOfElement: {
    description: 'Preserve spaces at the end of an element',
    html: '<html><body>Need <span>more </span>space <i>s </i>!<br></body></html>',
    expectedLineAttribs: ['+g*0+2+1'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceAtBeginOfElements: {
    description: 'Preserve spaces at the start of an element',
    html: '<html><body>Need<span> more</span> space<i> s</i> !<br></body></html>',
    expectedLineAttribs: ['+f*0+2+2'],
    expectedText: ['Need more space s !']
  },
};

describe(__filename, function () {
  for (const test of Object.keys(tests)) {
    const testObj = tests[test];
    describe(test, function () {
      if (testObj.disabled) {
        return xit('DISABLED:', test, function (done) {
          done();
        });
      }

      it(testObj.description, function (done) {
        const $ = cheerio.load(testObj.html); // Load HTML into Cheerio
        const doc = $('body')[0]; // Creates a dom-like representation of HTML
        // Create an empty attribute pool
        const apool = new AttributePool();
        // Convert a dom tree into a list of lines and attribute liens
        // using the content collector object
        const cc = contentcollector.makeContentCollector(true, null, apool);
        cc.collectContent(doc);
        const result = cc.finish();
        const recievedAttributes = result.lineAttribs;
        const expectedAttributes = testObj.expectedLineAttribs;
        const recievedText = new Array(result.lines);
        const expectedText = testObj.expectedText;

        // Check recieved text matches the expected text
        if (arraysEqual(recievedText[0], expectedText)) {
          console.log("PASS: Recieved Text did match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
        } else {
          console.error('FAIL: Recieved Text did not match Expected Text\nRecieved:', recievedText[0], '\nExpected:', testObj.expectedText);
          throw new Error();
        }

        // Check recieved attributes matches the expected attributes
        if (arraysEqual(recievedAttributes, expectedAttributes)) {
          console.log("PASS: Recieved Attributes matched Expected Attributes", recievedAttributes, expectedAttributes);
          done();
        } else {
          console.error('FAIL', test, testObj.description);
          console.error('FAIL: Recieved Attributes did not match Expected Attributes\nRecieved: ', recievedAttributes, '\nExpected: ', expectedAttributes);
          console.error('FAILING HTML', testObj.html);
          throw new Error();
        }
      });
    });
  }
});


function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
