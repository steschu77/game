// ----------------------------------------------------------------------------
function isEqualId(id1, id2) {
  return id1[0] === id2[0] && id1[1] === id2[1]
      && id1[2] === id2[2] && id1[3] === id2[3];
}

// ----------------------------------------------------------------------------
class ContactPoint {
  constructor() {
    this.separation = 0;
    this.massNormal = 0;
    this.massTangent = 0;
    this.bias = 0;
    this.Pn = 0;
    this.Pt = 0;
  }
}

// ----------------------------------------------------------------------------
class Manifold {
  
  constructor(body1, body2) {
    this.body1 = body1;
    this.body2 = body2;
    this.contacts = [];
    this.friction = Math.sqrt(body1.friction * body2.friction);
  }

  update(old_m) {
    this.contacts.forEach(function(new_c) {
      old_m.contacts.forEach(function(old_c) {
        if (isEqualId(new_c.id, old_c.id)) {
          new_c.Pn = old_c.Pn;
          new_c.Pt = old_c.Pt;
        }
      });
    });
  }

  preStep(inv_dt) {
    const b1 = this.body1;
    const b2 = this.body2;

    const k_allowedPenetration = 0.01;
    const k_biasFactor = 0.2;

    this.contacts.forEach(function(c) {

      const normal = c.normal;
      const tangent = c.normal.perpendicular().neg();

      const r1 = v2SubVV(c.position, b1.position);
      const r2 = v2SubVV(c.position, b2.position);

      const invMass = b1.invMass + b2.invMass

      // precompute normal mass, tangent mass, and bias.
      const rn1 = v2Dot(r1, normal);
      const rn2 = v2Dot(r2, normal);
      const invN1 = b1.invI * (v2Dot(r1, r1) - rn1 * rn1);
      const invN2 = b2.invI * (v2Dot(r2, r2) - rn2 * rn2);
      const kNormal = b1.invMass + b2.invMass + invN1 + invN2;
      c.massNormal = 1.0 / kNormal;

      const rt1 = v2Dot(r1, tangent);
      const rt2 = v2Dot(r2, tangent);
      const invT1 = b1.invI * (v2Dot(r1, r1) - rt1 * rt1);
      const invT2 = b2.invI * (v2Dot(r2, r2) - rt2 * rt2);
      let kTangent = b1.invMass + b2.invMass + invT1 + invT2;
      c.massTangent = 1.0 / kTangent;

      c.bias = -k_biasFactor * inv_dt
        * Math.min(0.0, c.separation + k_allowedPenetration);

      // apply normal + friction impulse
      const P_u0 = c.Pn * normal.u0 + c.Pt * tangent.u0;
      const P_u1 = c.Pn * normal.u1 + c.Pt * tangent.u1;
      const P = new Vec2(P_u0, P_u1);

      b1.applyImpulse(c.position, P.neg());
      b2.applyImpulse(c.position, P);
    });
  }

  applyImpulse() {
    const b1 = this.body1;
    const b2 = this.body2;

    this.contacts.forEach(function(c) {

      const normal = c.normal;
      const tangent = c.normal.perpendicular().neg();

      const vr1 = b1.relativeVelocity(c.position);
      const vr2 = b2.relativeVelocity(c.position);

      // Relative velocity at contact
      const dv = v2SubVV(vr2, vr1);

      // Compute normal impulse / friction impulse
      const vn = v2Dot(dv, normal);
      const vt = v2Dot(dv, tangent);

      let dPn = c.massNormal * (-vn + c.bias);
      let dPt = c.massTangent * (-vt);

      // Clamp the accumulated impulses
      const Pn0 = c.Pn;
      const Pt0 = c.Pt;

      const maxPt = this.friction * c.Pn;
      c.Pn = Math.max(Pn0 + dPn, 0.0);
      c.Pt = Math.min(Math.max(Pt0 + dPt, -maxPt), maxPt);

      dPn = c.Pn - Pn0;
      dPt = c.Pt - Pt0;

      // Apply contact impulse
      const P_u0 = dPn * normal.u0 + dPt * tangent.u0;
      const P_u1 = dPn * normal.u1 + dPt * tangent.u1;
      const P = new Vec2(P_u0, P_u1);

      b1.applyImpulse(c.position, P.neg());
      b2.applyImpulse(c.position, P);
    }, this);
  }
}
