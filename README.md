# Super Luigi Bros

A Super Mario Bros inspired platformer featuring **Luigi** as the protagonist, built with pure HTML5 Canvas, CSS and vanilla JavaScript — no frameworks, no dependencies.

## 🎮 How to Play

| Key | Action |
|-----|--------|
| `Arrow Left` / `A` | Move left |
| `Arrow Right` / `D` | Move right |
| `Space` / `Arrow Up` / `W` | Jump |
| `Space` / `Enter` | Start / Continue |

## 🕹️ Game Features

- **Luigi** drawn with Canvas 2D rectangles — green cap with "L", blue overalls, skin face, mustache
- **Physics**: gravity, jump, acceleration/friction system
- **Horizontal scroll** with smooth camera following Luigi
- **Ground** + **8 floating platforms**
- **4 Question blocks** that award coins when hit from below
- **6 Goombas** with patrol AI — stomp them by jumping on top!
- **8 Coins** with bob animation
- **Parallax background** with clouds and hills
- **HUD**: LUIGI / Score / Coins / Lives
- **Screens**: Start, Dead, Game Over, Win with flag at end
- `requestAnimationFrame` game loop

## 🚀 Running the Game

### Option 1 — Open directly
Just open `index.html` in any modern browser.

### Option 2 — Local server
```bash
npm start
```
Then open [http://localhost:3000](http://localhost:3000)

### Option 3 — PM2 (production)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 📁 Project Structure

```
super-luigi-bros/
├── index.html       # Entry point with canvas
├── style.css        # Global styles
├── game.js          # Full game engine
├── package.json
├── ecosystem.config.js
├── .env.example
└── README.md
```

## 🎯 Tips

- Hit `?` blocks from **below** to get coins
- **Stomp** goombas by landing on their heads
- Reach the **flag pole** at the end of the level to win!
- You have **3 lives** — falling into a pit costs one
