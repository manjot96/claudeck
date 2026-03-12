import Bonjour from "bonjour-service"
import { hostname } from "node:os"

let bonjour: InstanceType<typeof Bonjour> | null = null

export function advertise(port: number): void {
  bonjour = new Bonjour()
  bonjour.publish({
    name: `ClauDeck on ${hostname()}`,
    type: "claudeck",
    port,
    txt: { version: "0.1.0" },
  })
}

export function getMdnsName(): string {
  return `${hostname()}.local`
}

export function stopAdvertising(): Promise<void> {
  return new Promise((resolve) => {
    if (bonjour) {
      bonjour.unpublishAll(() => {
        bonjour?.destroy()
        bonjour = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}
