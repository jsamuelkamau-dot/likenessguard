# 🎨 EasyPiky Dark Green Theme Showcase

## Color Palette

### Primary Colors
```
🟢 Electric Green (#00ff88)  - Primary accent, buttons, highlights
🟢 Kelly Green (#00cc6a)     - Gradient secondary, hover states
🟢 Light Green (#7dd3ae)     - Secondary text, labels
🟢 Pale Green (#b8e6d5)      - Body text, descriptions
```

### Background Colors
```
⬛ Deep Dark (#0a1612)       - Main background
⬛ Dark Green (#0d2818)      - Header backgrounds
⬛ Card Dark (#0f2419)       - Card/section backgrounds
⬛ Card Green (#1a3d2e)      - Card gradient end
```

### Accent Colors
```
🔴 Danger Red (#ff4444)      - High risk, errors
🟠 Warning Orange (#ffaa00)  - Medium risk, warnings
🟢 Success Green (#00ff88)   - Safe, success states
```

## Visual Effects

### Glowing Text
```css
text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
```
**Used on**: Headings, important text, status indicators

### Card Shadows
```css
box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
```
**Used on**: Cards, modals, elevated elements

### Border Glow
```css
border: 2px solid rgba(0, 255, 136, 0.3);
```
**Used on**: Active elements, focused inputs, important containers

### Hover Effects
```css
transform: translateY(-2px);
box-shadow: 0 6px 25px rgba(0, 255, 136, 0.5);
```
**Used on**: Buttons, cards, interactive elements

## Component Styles

### 1. Buttons

#### Primary Button
```css
background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
color: #0a1612;
font-weight: 600;
box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
border-radius: 8px;
padding: 12px 24px;
```

**Hover State:**
```css
background: linear-gradient(135deg, #00cc6a 0%, #00aa55 100%);
transform: translateY(-2px);
box-shadow: 0 6px 25px rgba(0, 255, 136, 0.5);
```

#### Secondary Button
```css
background: rgba(0, 255, 136, 0.1);
color: #00ff88;
border: 1px solid rgba(0, 255, 136, 0.3);
```

**Hover State:**
```css
background: rgba(0, 255, 136, 0.2);
border-color: #00ff88;
```

### 2. Cards

#### Standard Card
```css
background: linear-gradient(135deg, #0f2419 0%, #1a3d2e 100%);
border-radius: 12px;
padding: 24px;
box-shadow: 0 4px 16px rgba(0, 255, 136, 0.15);
border: 1px solid rgba(0, 255, 136, 0.2);
```

**Hover State:**
```css
transform: translateY(-4px);
box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
border-color: #00ff88;
```

### 3. Headers

#### Main Header
```css
background: linear-gradient(135deg, #0d2818 0%, #1a4d2e 100%);
color: #00ff88;
padding: 40px;
border-radius: 16px;
box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
border: 2px solid rgba(0, 255, 136, 0.3);
```

#### Section Header
```css
font-size: 28px;
color: #00ff88;
text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
margin-bottom: 20px;
```

### 4. Form Controls

#### Input Fields
```css
background: rgba(0, 255, 136, 0.05);
border: 1px solid rgba(0, 255, 136, 0.3);
color: #b8e6d5;
border-radius: 8px;
padding: 12px 16px;
```

**Focus State:**
```css
border-color: #00ff88;
box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.2);
background: rgba(0, 255, 136, 0.1);
```

#### Checkboxes
```css
accent-color: #00ff88;
transform: scale(1.2);
```

### 5. Progress Bars

#### Container
```css
background: rgba(0, 255, 136, 0.1);
border-radius: 10px;
height: 12px;
border: 1px solid rgba(0, 255, 136, 0.2);
```

#### Fill
```css
background: linear-gradient(90deg, #00ff88, #00cc6a);
border-radius: 10px;
box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
```

### 6. Badges

#### Safe Badge
```css
background: rgba(0, 255, 136, 0.2);
color: #00ff88;
border: 1px solid rgba(0, 255, 136, 0.3);
padding: 4px 12px;
border-radius: 20px;
```

#### Warning Badge
```css
background: rgba(255, 170, 0, 0.2);
color: #ffaa00;
border: 1px solid rgba(255, 170, 0, 0.3);
```

#### Danger Badge
```css
background: rgba(255, 68, 68, 0.2);
color: #ff8888;
border: 1px solid rgba(255, 68, 68, 0.3);
```

### 7. Status Indicators

#### Active Status
```css
width: 12px;
height: 12px;
background: #00ff88;
border-radius: 50%;
box-shadow: 0 0 8px #00ff88;
```

#### Warning Status
```css
background: #ffaa00;
box-shadow: 0 0 8px #ffaa00;
```

#### Inactive Status
```css
background: #ff4444;
box-shadow: 0 0 8px #ff4444;
```

## Animations

### Fade In
```css
@keyframes easypiky-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: easypiky-fadeIn 0.3s ease;
```

### Slide Up
```css
@keyframes easypiky-slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
animation: easypiky-slideUp 0.3s ease;
```

### Hover Transform
```css
transition: all 0.3s ease;
transform: translateY(-2px);
```

## Layout Patterns

### Grid Layout
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 20px;
```

### Flex Layout
```css
display: flex;
flex-direction: column;
gap: 12px;
```

### Centered Content
```css
display: flex;
align-items: center;
justify-content: center;
```

## Typography

### Headings
```css
/* H1 */
font-size: 48px;
color: #00ff88;
text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);

/* H2 */
font-size: 28px;
color: #00ff88;
text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);

/* H3 */
font-size: 18px;
color: #00ff88;
font-weight: 600;
```

### Body Text
```css
font-size: 16px;
color: #b8e6d5;
line-height: 1.6;
```

### Secondary Text
```css
font-size: 14px;
color: #7dd3ae;
```

### Monospace (URLs)
```css
font-family: monospace;
font-size: 14px;
color: #b8e6d5;
```

## Spacing System

### Padding
```
Small:  12px
Medium: 20px
Large:  32px
XLarge: 40px
```

### Margins
```
Small:  8px
Medium: 16px
Large:  24px
XLarge: 32px
```

### Gaps
```
Tight:  8px
Normal: 12px
Loose:  20px
```

## Border Radius

```
Small:  8px  (buttons, inputs)
Medium: 12px (cards)
Large:  16px (modals, headers)
Round:  50%  (status indicators)
Pill:   20px (badges)
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Adjust padding, font sizes */
}

/* Tablet */
@media (max-width: 1024px) {
  /* Adjust grid columns */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Full layout */
}
```

## Usage Examples

### Creating a Card
```html
<div style="
  background: linear-gradient(135deg, #0f2419 0%, #1a3d2e 100%);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 255, 136, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.2);
">
  <h3 style="color: #00ff88; margin-bottom: 12px;">Card Title</h3>
  <p style="color: #b8e6d5;">Card content goes here</p>
</div>
```

### Creating a Button
```html
<button style="
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #0a1612;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
  transition: all 0.3s;
">
  Click Me
</button>
```

### Creating a Status Indicator
```html
<span style="
  display: inline-block;
  width: 12px;
  height: 12px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 8px #00ff88;
  margin-right: 8px;
"></span>
```

## Design Principles

### 1. Consistency
- Use the same colors throughout
- Maintain spacing system
- Apply effects uniformly

### 2. Hierarchy
- Larger, brighter elements are more important
- Use glow effects for emphasis
- Layer shadows for depth

### 3. Feedback
- Hover states on all interactive elements
- Smooth transitions (0.3s)
- Visual confirmation of actions

### 4. Accessibility
- High contrast text
- Clear focus states
- Readable font sizes
- Descriptive labels

### 5. Performance
- Use transform for animations
- Minimize repaints
- Efficient CSS selectors
- Lazy load when possible

---

**Theme**: Dark Shiny Green with Electric Accents
**Style**: Professional Cybersecurity Aesthetic
**Mood**: Trustworthy, Modern, Secure
