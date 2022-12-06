// ----------------------------------------------------------------------------
class Joint {

  constructor(body1, body2, anchor) {
    this.body1 = body1;
    this.body2 = body2;

    this.localAnchor1 = body1.localPosition(anchor);
    this.localAnchor2 = body2.localPosition(anchor);

    this.P = new Vec2(0, 0);

    this.softness = 0.001;
  }

  preStep(inv_dt) {

    const b1 = this.body1;
    const b2 = this.body2;

    // Pre-compute anchors, mass matrix, and bias.
    this.r1 = b1.worldPosition(this.localAnchor1);
    this.r2 = b2.worldPosition(this.localAnchor2);
    const r1 = v2SubVV(this.r1, b1.position);
    const r2 = v2SubVV(this.r2, b2.position);

    const invMass = b1.invMass + b2.invMass;
    const invI1 = b1.invI;
    const invI2 = b2.invI;

    const k00 = invI1 * r1.u1 * r1.u1 + invI2 * r2.u1 * r2.u1 + invMass + this.softness;
    const k01 = invI1 * r1.u0 * r1.u1 + invI2 * r2.u0 * r2.u1;
    const k11 = invI1 * r1.u0 * r1.u0 + invI2 * r2.u0 * r2.u0 + invMass + this.softness;

    this.M = v2Inverse(k00, -k01, -k01, k11);
    const dp = v2SubVV(this.r2, this.r1);

    const k_biasFactor = 0.1;
    const bias_u0 = -k_biasFactor * inv_dt * (this.r2.u0 - this.r1.u0);
    const bias_u1 = -k_biasFactor * inv_dt * (this.r2.u1 - this.r1.u1);
    this.bias = new Vec2(bias_u0, bias_u1);

    // Apply accumulated impulse.
    b1.applyImpulse(this.r1, this.P.neg());
    b2.applyImpulse(this.r2, this.P);
  }

  applyImpulse() {
    const b1 = this.body1;
    const b2 = this.body2;

    const dv = v2SubVV(
      b2.relativeVelocity(this.r2),
      b1.relativeVelocity(this.r1));

    const d_u0 = this.bias.u0 - dv.u0 - this.softness * this.P.u0;
    const d_u1 = this.bias.u1 - dv.u1 - this.softness * this.P.u1;
    const d = new Vec2(d_u0, d_u1);

    const P_u0 = v2Dot(this.M.v0, d);
    const P_u1 = v2Dot(this.M.v1, d);
    const P = new Vec2(P_u0, P_u1);

    b1.applyImpulse(this.r1, P.neg());
    b2.applyImpulse(this.r2, P);

    this.P.set(
      this.P.u0 + P.u0,
      this.P.u1 + P.u1);
  }
}
