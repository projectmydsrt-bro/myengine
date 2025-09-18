export class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.rotation = { x: 0, y: 0, z: 0 };
  }
}
