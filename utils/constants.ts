export const GRID_SIZE = 5
export const SCALE = 10 // Terug naar 10 pixels per meter

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export const boatTypes = {
  sailboat: { name: "Zeilboot", color: "#1E90FF", widthMultiplier: 1.5, height: 30 },
  motorboat: { name: "Motorboot", color: "#FF6347", widthMultiplier: 1.2, height: 25 },
}

export const sampleOwners = [{ name: "Jan van Dijk", phone: "06-12345678", email: "jan@voorbeeld.nl" }]
