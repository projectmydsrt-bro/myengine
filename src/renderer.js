export class Renderer {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
  }

  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  get domElement() {
    return this.canvas;
  }

  render(scene, camera) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "blue";
    scene.objects.forEach(obj => {
      this.context.fillRect(
        this.canvas.width / 2 - 50,
        this.canvas.height / 2 - 50,
        100,
        100
      );
    });
  }
}
