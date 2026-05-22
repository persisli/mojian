/**
 * reader/background.js - 背景管理 (纯色/文艺/国风/信笺 + 透明度) + 主题管理
 */

const backgroundPatterns = {
    artistic: {
        hexagon: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iLTkgLTEwIDE4IDIwIj48cGF0aCBkPSJNMCAtMTBMOC42NiAtNUw4LjY2IDVMMCAxMEwtOC42NiA1TC04LjY2IC01WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjAiIGN5PSItMTAiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjguNjYiIGN5PSItNSIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iOC42NiIgY3k9IjUiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iLTguNjYiIGN5PSI1IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSItOC42NiIgY3k9Ii01IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        triangle: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDIwIDM1Ij48cGF0aCBkPSJNMTAgMEwyMCAxNy4zMkwwIDE3LjMyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxwYXRoIGQ9Ik0wIDE3LjMyTDIwIDE3LjMyTDEwIDM0LjY0WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNy4zMiIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjE3LjMyIiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjM0LjY0IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        diamond: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cGF0aCBkPSJNNDAgMEw4MCA0MEw0MCA4MEwwIDQwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjQwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PC9zdmc+')",
        nodes: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI4MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjgwIiB5MT0iMCIgeDI9IjAiIHkyPSI4MCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxsaW5lIHgxPSI0MCIgeTE9IjAiIHgyPSI0MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjAiIHkxPSI0MCIgeDI9IjgwIiB5Mj0iNDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiLz48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI4MCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjMiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIzIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSIwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI4MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI0MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')"
    },
    chinese: {
        landscape: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJza3lHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWY1ZGMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlOGY1ZTkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNza3lHcmFkaWVudCkiLz48cGF0aCBkPSJNMCA0MDBRMTUwIDM1MCAzMDAgNDAwVDYwMCAzODBRNzUwIDQwMCA4MDAgMzkwVjYwMEgwVjQwMFoiIGZpbGw9IiNjNGM0YjAiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9TTAgNDUwUTE1MCA0MDAgMzAwIDQ1MFQ2MDAgNDMwUTc1MCA0NTAgODAwIDQ0MFY2MDBIMFY0NTBaIiBmaWxsPSIjYTRhNDkwIiBvcGFjaXR5PSIwLjIiLz48cGF0aCBkPSJNMTUwIDM1MEwyMDAgMzAwTDI1MCAzNTBMMzAwIDI4MEwzNTAgMzUwTDQwMCAyOTBMNDUwIDM1MEw1MDAgMjgwTDU1MCAzNTBMNjAwIDMwMEw2NTAgMzUwTDcwMCAyOTBMNzUwIDM1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNCIvPjxwYXRoIGQ9TTEwMCA0MDBMMTUwIDM1MEwyMDAgNDAwTDI1MCAzNDBMMzAwIDQwMEwzNTAgMzMwTDQwMCA0MDBMNDUwIDM0MEw1MDAgNDAwTDU1MCAzMzBMNjAwIDQwMEw2NTAgMzQwTDcwMCA0MDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhmOGY3ZiIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PC9zdmc+')",
        flowers: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMC4yIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjEwMCIgcj0iMzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSI2NTAiIGN5PSIxMDAiIHI9IjI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNjNGM0YjAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjEwMCIgcj0iMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48cGF0aCBkPSJNMjAwIDQwMEMyNTAgMzUwIDMwMCAzODAgMzUwIDQwMEM0MDAgNDIwIDQ1MCAzOTAgNTAwIDQwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48cGF0aCBkPSJNMjUwIDQ1MEMzMDAgNDAwIDM1MCA0MzAgNDAwIDQ1MDQ1MCA0NzAgNTAwIDQ0MCA1NTAgNDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM4ZjhmN2YiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PC9zdmc+')",
        calligraphy: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PHBhdGggZD0iTTUwIDUwQzEwMCAxMDAgMTUwIDgwIDIwMCAxMjBDMjUwIDE2MCAzMDAgMTQwIDM1MCAxODBDNDAwIDIyMCA0NTAgMjAwIDUwMCAyNDBDNTUwIDI4MCA2MDAgMjYwIDY1MCAzMDBDNzAwIDM0MCA3NTAgMzIwIDgwMCAzNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhmOGY3ZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTUwIDIwMEMxMDAgMjUwIDE1MCAyMzAgMjAwIDI3MEMyNTAgMzEwIDMwMCAyOTAgMzUwIDMzMEM0MDAgMzcwIDQ1MCAzNTAgNTAwIDM5MEM1NTAgNDMwIDYwMCA0MTAgNjUwIDQ1MUM3MDAgNDkxIDc1MCA0NzEgODAwIDUxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9TTUwIDM1MEMxMDAgNDAwIDE1MCAzODAgMjAwIDQyMEMyNTAgNDYwIDMwMCA0NDAgMzUwIDQ4MEM0MDAgNTIwIDQ1MCA1MDAgNTAwIDU0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48L3N2Zz4=')",
        lattice: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48bGluZSB4MT0iMjUwIiB5MT0iNTAiIHgyPSIyNTAiIHkyPSI1NTAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTUwIiB5MT0iNTAiIHgyPSI1NTAiIHkyPSI1NTAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTAiIHkxPSIyMDAiIHgyPSI3NTAiIHkyPSIyMDAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTAiIHkxPSI0MDAiIHgyPSI3NTAiIHkyPSI0MDAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48L3N2Zz4=')"
    },
    stationery: {
        vintage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJwYXBlckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y4ZjhmOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI3BhcGVyR3JhZGllbnQpIi8+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iNzIwIiBoZWlnaHQ9IjUyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNjAiIHkxPSI2MCIgeDI9Ijc0MCIgeTI9IjYwIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMC41Ii8+PGxpbmUgeDE9IjYwIiB5MT0iODAiIHgyPSI3NDAiIHkyPSI4MCIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')",
        kraft: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJrcmFmdEdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjBlNSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWFlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2tyYWZ0R3JhZGllbnQpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjE1MCIgcj0iMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSI0NTAiIHI9IjI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGNpcmNsZSBjeD0iNjUwIiBjeT0iNDUwIiByPSIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')",
        watercolor: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJ3YXRlckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2YwZjBmMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI3dhdGVyR3JhZGllbnQpIi8+PGVsbGlwc2UgY3g9IjIwMCIgY3k9IjE1MCIgcng9IjgwIiByeT0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48ZWxsaXBzZSBjeD0iNjAwIiBjeT0iMTUwIiByeD0iODAiIHJ5PSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxlbGxpcHNlIGN4PSIyMDAiIGN5PSI0NTAiIHJ4PSI4MCIgcnk9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4yIi8+PGVsbGlwc2UgY3g9IjYwMCIgY3k9IjQ1MCIgcng9IjgwIiByeT0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48L3N2Zz4=')",
        sketch: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJza2V0Y2hHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmMGYwZjAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNza2V0Y2hHcmFkaWVudCkiLz48bGluZSB4MT0iMTAwIiB5MT0iMTAwIiB4Mj0iNzAwIiB5Mj0iMTAwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGxpbmUgeDE9IjEwMCIgeTE9IjIwMCIgeDI9IjcwMCIgeTI9IjIwMCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxsaW5lIHgxPSIxMDAiIHkxPSIzMDAiIHgyPSI3MDAiIHkyPSIzMDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48bGluZSB4MT0iMTAwIiB5MT0iNDAwIiB4Mj0iNzAwIiB5Mj0iNDAwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGxpbmUgeDE9IjEwMCIgeTE9IjUwMCIgeDI9IjcwMCIgeTI9IjUwMCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')"
    }
};

const defaultBackgroundColors = {
    solid: '#FAFAF8',
    artistic: '#FAFAF8',
    chinese: '#F5F5DC',
    stationery: '#FFFFFF'
};

function applyBackground() {
    const { elements, state } = window.Mojian;
    const baseColor = state.settings.backgroundType === 'solid'
        ? state.settings.background
        : defaultBackgroundColors[state.settings.backgroundType];
    const pattern = state.settings.backgroundType !== 'solid'
        ? backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern]
        : null;

    const opacity = state.settings.bgOpacity / 100;

    const hexToRgba = (hex, alpha) => {
        const h = hex.replace('#', '');
        const r = parseInt(h.substr(0, 2), 16);
        const g = parseInt(h.substr(2, 2), 16);
        const b = parseInt(h.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const blendColors = (foreground, background, opacity) => {
        const fg = foreground.replace('#', '');
        const bg = background.replace('#', '');
        const fgR = parseInt(fg.substr(0, 2), 16);
        const fgG = parseInt(fg.substr(2, 2), 16);
        const fgB = parseInt(fg.substr(4, 2), 16);
        const bgR = parseInt(bg.substr(0, 2), 16);
        const bgG = parseInt(bg.substr(2, 2), 16);
        const bgB = parseInt(bg.substr(4, 2), 16);
        const r = Math.round(fgR * opacity + bgR * (1 - opacity));
        const g = Math.round(fgG * opacity + bgG * (1 - opacity));
        const b = Math.round(fgB * opacity + bgB * (1 - opacity));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const adjustColor = (color, amount) => {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const blockquoteBg = adjustColor(baseColor, -8);
    const codeBg = adjustColor(baseColor, -12);
    const tableHeaderBg = adjustColor(baseColor, -5);

    const bgColorWithOpacity = hexToRgba(baseColor, opacity);
    const blockquoteBgWithOpacity = hexToRgba(blockquoteBg, opacity);
    const codeBgWithOpacity = hexToRgba(codeBg, opacity);
    const tableHeaderBgWithOpacity = hexToRgba(tableHeaderBg, opacity);

    document.body.style.backgroundColor = bgColorWithOpacity;
    document.documentElement.style.setProperty('--bg-page', bgColorWithOpacity);
    document.documentElement.style.setProperty('--bg-pattern-opacity', opacity);

    if (state.settings.backgroundType === 'solid' || !pattern) {
        document.documentElement.style.setProperty('--bg-pattern', 'none');
    } else {
        document.documentElement.style.setProperty('--bg-pattern', pattern);
    }

    elements.markdownContent.style.backgroundColor = 'transparent';
    elements.markdownContent.style.backgroundImage = 'none';
    document.documentElement.style.setProperty('--bg-content', 'transparent');

    if (state.settings.backgroundType === 'solid') {
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.style.backgroundColor = bgColorWithOpacity;
        }
    } else {
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.style.backgroundColor = '';
        }
    }

    const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
    blockquotes.forEach(bq => {
        bq.style.backgroundColor = blockquoteBgWithOpacity;
        bq.style.backgroundImage = 'none';
    });

    const preBlocks = elements.markdownContent.querySelectorAll('pre');
    preBlocks.forEach(pre => {
        pre.style.backgroundColor = codeBgWithOpacity;
        pre.style.backgroundImage = 'none';
    });

    const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
    inlineCodes.forEach(code => {
        code.style.backgroundColor = hexToRgba(adjustColor(baseColor, -15), opacity);
    });

    const tables = elements.markdownContent.querySelectorAll('table');
    tables.forEach(table => {
        if (state.settings.backgroundType === 'solid' && baseColor.toUpperCase() === '#FAFAF8') {
            table.style.backgroundColor = 'rgb(251, 251, 251)';
        } else {
            table.style.backgroundColor = bgColorWithOpacity;
        }
        table.style.backgroundImage = 'none';
    });

    const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
    tableHeaders.forEach(th => {
        th.style.backgroundColor = tableHeaderBgWithOpacity;
        th.style.backgroundImage = 'none';
    });

    const themeBgColor = state.isDarkMode ? '#1A1A2E' : '#FAFAF8';
    const blendedHeaderBg = blendColors(baseColor, themeBgColor, opacity);
    elements.header.style.backgroundColor = blendedHeaderBg;
    elements.header.style.backgroundImage = 'none';

    const blendedStatusBg = blendColors(baseColor, themeBgColor, opacity);
    elements.statusBar.style.backgroundColor = blendedStatusBg;
    elements.statusBar.style.backgroundImage = 'none';
}

function updateBackgroundSelection() {
    const { elements, state } = window.Mojian;
    elements.bgOptions.forEach(opt => {
        opt.classList.remove('selected');
        const isSolid = opt.dataset.bg === 'solid' && opt.dataset.color === state.settings.background;
        const isPattern = opt.dataset.bg === state.settings.backgroundType &&
                         opt.dataset.pattern === state.settings.backgroundPattern;
        if (isSolid || isPattern) {
            opt.classList.add('selected');
        }
    });
}

function updateBackgroundUIState() {
    const { elements, state } = window.Mojian;
    const isDisabled = state.isDarkMode;
    elements.bgTabs.forEach(tab => {
        tab.disabled = isDisabled;
        tab.style.pointerEvents = isDisabled ? 'none' : 'auto';
        tab.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOptions.forEach(option => {
        option.style.pointerEvents = isDisabled ? 'none' : 'auto';
        option.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOpacitySlider.disabled = isDisabled;
    elements.bgOpacitySlider.style.pointerEvents = isDisabled ? 'none' : 'auto';
    elements.bgOpacitySlider.style.opacity = isDisabled ? '0.5' : '1';
}

function loadThemePreference() {
    applyTheme();
}

function toggleTheme() {
    const { state } = window.Mojian;
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    sessionStorage.setItem('beforeRefreshState', JSON.stringify({
        currentFile: state.currentFile,
        content: state.content,
        isDarkMode: state.isDarkMode,
        isEditMode: state.isEditMode,
        scrollY: window.pageYOffset || document.documentElement.scrollTop
    }));
    location.reload();
}

function applyTheme() {
    const { elements, state } = window.Mojian;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');

    if (state.isDarkMode) {
        const darkBg = '#0a0e1a';
        const darkerBg = '#0d0d1a';
        const tableHeaderBg = '#1a1a2e';

        document.body.style.backgroundColor = darkBg;
        elements.markdownContent.style.backgroundColor = 'transparent';
        elements.markdownContent.style.backgroundImage = 'none';
        elements.header.style.backgroundColor = darkBg;
        elements.header.style.backgroundImage = 'none';
        elements.statusBar.style.backgroundColor = darkBg;
        elements.statusBar.style.backgroundImage = 'none';
        document.documentElement.style.setProperty('--bg-page', darkBg);
        document.documentElement.style.setProperty('--bg-content', 'transparent');
        document.documentElement.style.setProperty('--bg-pattern', 'none');
        document.documentElement.style.setProperty('--bg-pattern-opacity', 1);

        const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.backgroundColor = darkerBg;
            bq.style.backgroundImage = 'none';
        });

        const preBlocks = elements.markdownContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            pre.style.backgroundColor = darkerBg;
            pre.style.backgroundImage = 'none';
        });

        const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.style.backgroundColor = '#1a1a2e';
        });

        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach(table => {
            table.style.backgroundColor = darkBg;
            table.style.backgroundImage = 'none';
        });

        const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
        tableHeaders.forEach(th => {
            th.style.backgroundColor = tableHeaderBg;
            th.style.backgroundImage = 'none';
        });
    } else {
        applyBackground();
    }
}

window.Mojian = window.Mojian || {};
Mojian.applyBackground = applyBackground;
Mojian.updateBackgroundSelection = updateBackgroundSelection;
Mojian.updateBackgroundUIState = updateBackgroundUIState;
Mojian.loadThemePreference = loadThemePreference;
Mojian.toggleTheme = toggleTheme;
Mojian.applyTheme = applyTheme;
