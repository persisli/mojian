# 成就系统测试文档

这是一个用于测试成就系统的文档。

## 测试说明

为了测试成就系统，你需要：

1. **初窥门径**成就：累计阅读 10,000 字
2. **博览群书**成就：累计阅读 100,000 字
3. **持之以恒**成就：连续阅读 7 天

## 快速测试方法

### 方法一：手动触发（推荐用于测试）

打开浏览器控制台（F12），运行以下代码：

```javascript
// 解锁"初窥门径"成就（10,000字）
localStorage.setItem('easterEggData', JSON.stringify({
    totalWordsRead: 10000,
    readingStreak: 1,
    lastReadDate: new Date().toDateString(),
    badges: []
}));
location.reload();

// 解锁"博览群书"成就（100,000字）
localStorage.setItem('easterEggData', JSON.stringify({
    totalWordsRead: 100000,
    readingStreak: 1,
    lastReadDate: new Date().toDateString(),
    badges: ['novice']
}));
location.reload();

// 解锁"持之以恒"成就（连续7天）
localStorage.setItem('easterEggData', JSON.stringify({
    totalWordsRead: 5000,
    readingStreak: 7,
    lastReadDate: new Date().toDateString(),
    badges: ['novice']
}));
location.reload();

// 重置所有成就
localStorage.removeItem('easterEggData');
location.reload();
```

### 方法二：自然阅读

多次加载不同的文档，累计阅读字数达到阈值。

## 其他彩蛋测试

### Konami Code（科乐美秘籍）

在页面上依次按下键盘：
`↑ ↑ ↓ ↓ ← → ← → B A`

这将立即显示提示并进入黑客帝国数字雨效果，**按 S 键退出**。

### 诗意加载语

每次打开应用时，欢迎页面会随机显示一句诗意的话语。

## 查看当前成就状态

在浏览器控制台中运行：

```javascript
// 查看成就数据
console.log(JSON.parse(localStorage.getItem('easterEggData')));

// 查看已解锁的徽章
const data = JSON.parse(localStorage.getItem('easterEggData'));
if (data && data.badges) {
    console.log('已解锁的成就:', data.badges);
} else {
    console.log('尚未解锁任何成就');
}
```

## 成就列表

| 成就名称 | 图标 | 条件 | 描述 |
|---------|------|------|------|
| 初窥门径 | 📖 | 阅读满 10,000 字 | 开始你的阅读之旅 |
| 博览群书 | 📚 | 阅读满 100,000 字 | 成为真正的阅读者 |
| 持之以恒 | 🔥 | 连续阅读 7 天 | 坚持就是胜利 |

---

**祝你阅读愉快！** 🎉
