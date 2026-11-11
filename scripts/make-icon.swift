// Draws Diskshaper's app icon (1024x1024 PNG): blue tile, a storage bar that's partly cleared, and a sparkle.
import AppKit
let size: CGFloat = 1024
let img = NSImage(size: NSSize(width: size, height: size))
img.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext
let inset: CGFloat = 100
let rect = CGRect(x: inset, y: inset, width: size - inset * 2, height: size - inset * 2)
let tile = CGPath(roundedRect: rect, cornerWidth: 190, cornerHeight: 190, transform: nil)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -14), blur: 40, color: NSColor(white: 0, alpha: 0.35).cgColor)
ctx.addPath(tile); ctx.setFillColor(NSColor.black.cgColor); ctx.fillPath()
ctx.restoreGState()
ctx.saveGState()
ctx.addPath(tile); ctx.clip()
let cs = CGColorSpaceCreateDeviceRGB()
let g = CGGradient(colorsSpace: cs, colors: [
  NSColor(red: 0.56, green: 0.75, blue: 1.0, alpha: 1).cgColor,
  NSColor(red: 0.29, green: 0.53, blue: 0.96, alpha: 1).cgColor,
  NSColor(red: 0.17, green: 0.33, blue: 0.82, alpha: 1).cgColor] as CFArray, locations: [0, 0.5, 1])!
ctx.drawLinearGradient(g, start: CGPoint(x: 0, y: size - inset), end: CGPoint(x: 0, y: inset), options: [])
let glow = CGGradient(colorsSpace: cs, colors: [NSColor(white: 1, alpha: 0.28).cgColor, NSColor(white: 1, alpha: 0).cgColor] as CFArray, locations: [0, 1])!
ctx.drawRadialGradient(glow, startCenter: CGPoint(x: size * 0.42, y: size * 0.62), startRadius: 0, endCenter: CGPoint(x: size * 0.42, y: size * 0.62), endRadius: 420, options: [])
ctx.restoreGState()

// The storage bar: a dark track, a white "used" part, and a gap where space was freed.
let barX: CGFloat = 232, barW: CGFloat = 560, barH: CGFloat = 150, barY: CGFloat = 380
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 30, color: NSColor(red: 0.05, green: 0.12, blue: 0.4, alpha: 0.4).cgColor)
let track = CGPath(roundedRect: CGRect(x: barX, y: barY, width: barW, height: barH), cornerWidth: 46, cornerHeight: 46, transform: nil)
ctx.addPath(track); ctx.setFillColor(NSColor(red: 0.06, green: 0.1, blue: 0.24, alpha: 0.55).cgColor); ctx.fillPath()
ctx.restoreGState()
let pad: CGFloat = 22
let used = CGPath(roundedRect: CGRect(x: barX + pad, y: barY + pad, width: 300, height: barH - pad * 2), cornerWidth: 26, cornerHeight: 26, transform: nil)
ctx.addPath(used); ctx.setFillColor(NSColor.white.cgColor); ctx.fillPath()
// small leftover chip, showing the bar was cleaned
let chip = CGPath(roundedRect: CGRect(x: barX + pad + 300 + 18, y: barY + pad, width: 54, height: barH - pad * 2), cornerWidth: 20, cornerHeight: 20, transform: nil)
ctx.addPath(chip); ctx.setFillColor(NSColor(white: 1, alpha: 0.45).cgColor); ctx.fillPath()

// Sparkles above the freed space.
ctx.setFillColor(NSColor.white.cgColor)
func star(_ c: CGPoint, _ r: CGFloat) {
  let s = CGMutablePath()
  s.move(to: CGPoint(x: c.x, y: c.y + r))
  s.addQuadCurve(to: CGPoint(x: c.x + r, y: c.y), control: CGPoint(x: c.x + r * 0.16, y: c.y + r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x, y: c.y - r), control: CGPoint(x: c.x + r * 0.16, y: c.y - r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x - r, y: c.y), control: CGPoint(x: c.x - r * 0.16, y: c.y - r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x, y: c.y + r), control: CGPoint(x: c.x - r * 0.16, y: c.y + r * 0.16))
  ctx.addPath(s); ctx.fillPath()
}
star(CGPoint(x: 700, y: 660), 84)
star(CGPoint(x: 792, y: 590), 38)
img.unlockFocus()
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
