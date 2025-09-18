export class Renderer {
  constructor() {
    this.domElement = document.createElement("canvas");
    this.ctx = this.domElement.getContext("2d");  // atau WebGL jika lebih kompleks
  }

  setSize(width, height) {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render(scene, camera) {
    // contoh sederhana: bersihkan canvas, lalu tampil jumlah objek
    this.ctx.clearRect(0, 0, this.domElement.width, this.domElement.height);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.domElement.width, this.domElement.height);
    this.ctx.fillStyle = "white";
    this.ctx.fillText(`Objects: ${scene.objects.length}`, 10, 20);
  }
}
