export class Scene {
  constructor() {
    this.objects = [];
  }
  add(obj) {
    this.objects.push(obj);
    console.log("Object ditambahkan:", obj);
  }
}
