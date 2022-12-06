// ----------------------------------------------------------------------------
class Spring {

  preStep(inv_dt) {

    const b1 = this.body1;

    const dp = v2SubVV(b1.position, this.position);
    const dv = b1.velocity;

    const dl = dp.length() - _RestLength;
    const f = _k * dl; // <0 means compression, >0 means tension

    const r = dp.norm();
    const F = (r * f) + (_d * (dv * r)) * r;

    const Target = this.position + (_RestNormal * _RestLength);
    const dTarget = pos1 - Target;

    F += _k * dTarget;

  _p1->applyForce(-F);
}
