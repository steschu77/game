// ----------------------------------------------------------------------------
class World {
  constructor() {
    this.dynamicBodies = [];
    this.staticBodies = [];
    this.joints = [];
    this.manifolds = new Map();
  }

  addDynamicBody(obj) {
    const width = obj.width;
    const invMass = 1.0 / obj.mass;
    const invI = invMass * 12.0 / (width.u0 * width.u0 + width.u1 * width.u1);
    let body = new RigidBody(obj.id, obj.pos, obj.rot, obj.width, obj.mass, invMass, invI);
    this.dynamicBodies.push(body);
    return body;
  }

  addStaticBody(obj) {
    let body = new RigidBody(obj.id, obj.pos, obj.rot, obj.width, 0, 0, 0);
    this.staticBodies.push(body);
    return body;
  }

  addJoint(obj) {
    let joint = new Joint(obj.b1, obj.b2, obj.anchor);
    this.joints.push(joint);
    return joint;
  }

  step(dt) {
    const inv_dt = 1.0 / dt;

    this.collisionDetection();
    this.dynamicBodies.forEach(body => body.applyForce(new Vec2(0, -10 * body.mass)));
    this.dynamicBodies.forEach(body => body.integrateForces(dt));
    this.manifolds.forEach(manifold => manifold.preStep(inv_dt))
    this.joints.forEach(joint => joint.preStep(inv_dt))
    for (let i = 0; i < 6; ++i) {
      this.manifolds.forEach(manifold => manifold.applyImpulse())
      this.joints.forEach(joint => joint.applyImpulse())
    }
    this.dynamicBodies.forEach(body => body.integrateVelocities(dt));
  }

  collisionDetection() {

    let manifolds = new Map();

    // dynamic vs. dynamic
    for (let i = 0; i < this.dynamicBodies.length; ++i) {
      for (let j = i + 1; j < this.dynamicBodies.length; ++j) {
        this.collide(manifolds, this.dynamicBodies[i], this.dynamicBodies[j]);
      }
    }

    // dynamic vs. static
    for (let i = 0; i < this.dynamicBodies.length; ++i) {
      for (let j = 0; j < this.staticBodies.length; ++j) {
        this.collide(manifolds, this.dynamicBodies[i], this.staticBodies[j]);
      }
    }

    this.manifolds = manifolds;
  }

  collide(manifolds, bodyA, bodyB) {

    let new_m = collidePoly(bodyA, bodyB);
    if (new_m != null) {
      const key = bodyA.id + ":" + bodyB.id;
      const old_m = this.manifolds.get(key);
      if (old_m != null) {
        new_m.update(old_m);
      }
      manifolds.set(key, new_m);
    }
  }
}
