/**
 * editor/history.js - 编辑模式的撤回 / 重做（Ctrl+Z / Ctrl+Y）
 *
 * 采用「快照栈」方案：
 *   每次内容或格式发生变化时，记录一份 markdownContent 的 innerHTML 快照，
 *   撤回 / 重做就是在快照之间向前 / 向后移动一步。
 *
 * - 撤回：可一直溯源到进入编辑模式时的状态（即第一次修改之前）
 * - 重做：可一直前进到最新一次修改
 * - 每次操作只前进或后退一步
 */

(function () {
    var MAX_STEPS = 200;      // 最多保留的快照数量
    var DEBOUNCE_MS = 320;    // 连续输入合并为「一步」的时间窗口

    var OBSERVER_OPTIONS = {
        childList: true,
        subtree: true,
        characterData: true
    };

    var stack = [];           // [{ html: string, sel: object|null }]
    var pointer = -1;         // 当前所处的快照下标
    var observer = null;
    var debounceTimer = null;
    var active = false;
    var restoring = false;

    function container() {
        return (window.Mojian && window.Mojian.elements)
            ? window.Mojian.elements.markdownContent
            : null;
    }

    /* ================================================================
     * 光标位置序列化 / 还原（快照不含选区，需单独记录路径）
     * ================================================================ */

    function nodePath(node, root) {
        var path = [];
        var cur = node;
        while (cur && cur !== root) {
            var parent = cur.parentNode;
            if (!parent) return null;
            path.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
            cur = parent;
        }
        return cur === root ? path : null;
    }

    function nodeByPath(path, root) {
        var cur = root;
        for (var i = 0; i < path.length; i++) {
            if (!cur || !cur.childNodes || !cur.childNodes[path[i]]) return null;
            cur = cur.childNodes[path[i]];
        }
        return cur;
    }

    function clampOffset(node, offset) {
        if (!node) return 0;
        var max = (node.nodeType === Node.TEXT_NODE)
            ? (node.textContent || '').length
            : node.childNodes.length;
        return Math.max(0, Math.min(offset, max));
    }

    function captureSelection() {
        var root = container();
        var sel = window.getSelection();
        if (!root || !sel || sel.rangeCount === 0) return null;

        var range = sel.getRangeAt(0);
        if (range.startContainer !== root && !root.contains(range.startContainer)) return null;

        var startPath = nodePath(range.startContainer, root);
        var endPath = nodePath(range.endContainer, root);
        if (!startPath || !endPath) return null;

        return {
            startPath: startPath,
            startOffset: range.startOffset,
            endPath: endPath,
            endOffset: range.endOffset
        };
    }

    function applySelection(saved) {
        var root = container();
        if (!root || !saved) return;
        try {
            root.focus({ preventScroll: true });
            var startNode = nodeByPath(saved.startPath, root);
            var endNode = nodeByPath(saved.endPath, root);
            if (!startNode || !endNode) return;

            var range = document.createRange();
            range.setStart(startNode, clampOffset(startNode, saved.startOffset));
            range.setEnd(endNode, clampOffset(endNode, saved.endOffset));

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            /* 定位失败时忽略，不影响内容 */
        }
    }

    /* ================================================================
     * 快照记录
     * ================================================================ */

    function currentHtml() {
        var root = container();
        return root ? root.innerHTML : '';
    }

    function commitSnapshot() {
        if (!active || restoring) return;

        var html = currentHtml();
        if (pointer >= 0 && stack[pointer] && stack[pointer].html === html) {
            updateUndoRedoButtons();
            return;
        }

        // 产生新修改时丢弃「未来」的重做分支
        if (pointer < stack.length - 1) {
            stack = stack.slice(0, pointer + 1);
        }

        stack.push({ html: html, sel: captureSelection() });
        if (stack.length > MAX_STEPS) {
            stack.shift();
        }
        pointer = stack.length - 1;
        updateUndoRedoButtons();
    }

    function scheduleCommit() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            commitSnapshot();
        }, DEBOUNCE_MS);
    }

    /** 立即记录一步（用于格式按钮等离散操作） */
    function recordHistoryNow() {
        if (!active || restoring) return;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        commitSnapshot();
    }

    function onMutations() {
        if (!active || restoring) return;
        // 纯光标定位产生的辅助节点（如零宽断点）不计入历史
        if (window.Mojian.skipNextHistoryCommit) {
            window.Mojian.skipNextHistoryCommit = false;
            return;
        }
        scheduleCommit();
    }

    /* ================================================================
     * 恢复快照
     * ================================================================ */

    function restoreEntry(entry) {
        var root = container();
        if (!root || !entry) return;

        restoring = true;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (observer) observer.disconnect();

        root.innerHTML = entry.html;

        // 为自己编写的代码块重新绑定行号同步
        if (window.Mojian.initExistingCodeBlockSync) {
            try { window.Mojian.initExistingCodeBlockSync(); } catch (e) {}
        }

        // 规范化后 DOM 可能与快照略有差异，同步回当前条目，避免多出一步
        entry.html = root.innerHTML;

        applySelection(entry.sel);

        if (observer) observer.observe(root, OBSERVER_OPTIONS);

        // 同步外部状态（自动保存 / 字数统计 / 工具栏高亮）
        if (window.Mojian.autoSaveContent) window.Mojian.autoSaveContent(entry.html);
        if (window.Mojian.calculateStats) {
            window.Mojian.calculateStats(root.innerText || root.textContent);
        }
        if (window.Mojian.updateToolbarState) window.Mojian.updateToolbarState();

        restoring = false;
        updateUndoRedoButtons();
    }

    /* ================================================================
     * 撤回 / 重做
     * ================================================================ */

    function flushPending() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
            commitSnapshot();
        }
    }

    function undo() {
        if (!active) return false;
        flushPending();
        if (pointer <= 0) {
            updateUndoRedoButtons();
            return false;
        }
        // 记住「较新状态」的光标，便于重做时回到原位
        stack[pointer].sel = captureSelection();
        pointer--;
        restoreEntry(stack[pointer]);
        return true;
    }

    function redo() {
        if (!active) return false;
        flushPending();
        if (pointer >= stack.length - 1) {
            updateUndoRedoButtons();
            return false;
        }
        stack[pointer].sel = captureSelection();
        pointer++;
        restoreEntry(stack[pointer]);
        return true;
    }

    /* ================================================================
     * 初始化 / 销毁
     * ================================================================ */

    function initHistory() {
        var root = container();
        if (!root) return;

        destroyHistory();

        active = true;
        stack = [{ html: root.innerHTML, sel: captureSelection() }];
        pointer = 0;

        observer = new MutationObserver(onMutations);
        observer.observe(root, OBSERVER_OPTIONS);

        updateUndoRedoButtons();
    }

    function destroyHistory() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        stack = [];
        pointer = -1;
        active = false;
        updateUndoRedoButtons();
    }

    /** 根据可用性刷新撤回 / 重做按钮状态 */
    function updateUndoRedoButtons() {
        var undoBtn = document.querySelector('.toolbar-btn[data-action="undo"]');
        var redoBtn = document.querySelector('.toolbar-btn[data-action="redo"]');

        var canUndo = active && pointer > 0;
        var canRedo = active && pointer >= 0 && pointer < stack.length - 1;

        if (undoBtn) undoBtn.disabled = !canUndo;
        if (redoBtn) redoBtn.disabled = !canRedo;
    }

    window.Mojian = window.Mojian || {};
    Mojian.initHistory = initHistory;
    Mojian.destroyHistory = destroyHistory;
    Mojian.recordHistoryNow = recordHistoryNow;
    Mojian.undo = undo;
    Mojian.redo = redo;
    Mojian.updateUndoRedoButtons = updateUndoRedoButtons;
})();
