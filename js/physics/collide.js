// ----------------------------------------------------------------------------
function v2ClipSegment(cv, distance0, distance1, clipEdge, idx) {
  let t = distance0 / (distance0 - distance1);
  cv[idx].v = v2Interp(cv[0].v, cv[1].v, t);
  cv[idx].id[idx+0] = clipEdge;
  cv[idx].id[idx+2] = 0;
}

// ----------------------------------------------------------------------------
function clipSegmentToLine(cv, normal, vx, clipEdge) {
  const distance0 = v2Distance(normal, vx, cv[0].v);
  const distance1 = v2Distance(normal, vx, cv[1].v);
  if (distance0 > 0.0) {
    v2ClipSegment(cv, distance0, distance1, clipEdge, 0);
  } else if (distance1 > 0.0) {
    v2ClipSegment(cv, distance0, distance1, clipEdge, 1);
  }
}

// ----------------------------------------------------------------------------
function findMaxSeparation(poly1, poly2, flip) {
  const count1 = poly1.vertexCount;
  const count2 = poly2.vertexCount;

  let sij = new Array(count2);
  let si = new Array(count1);

  for (let i = 0; i < count1; ++i) {

    const n = poly1.normals[i];
    const v1 = poly1.vertices[i];

    for (let j = 0; j < count2; ++j) {
      sij[j] = v2Distance(n, v1, poly2.vertices[j]);
    }

    si[i] = sij.reduce((min, x) => x < min ? x : min);
  }

  const index = si.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);

  return {
    poly1: poly1,
    poly2: poly2,
    maxSeparation: si[index],
    index: index,
    flip: flip
  }
}

// ----------------------------------------------------------------------------
function findIncidentEdge(refEdge) {

  const count2 = refEdge.poly2.vertexCount;
  const normal1 = refEdge.poly1.normals[refEdge.index];

  let dots = new Array(count2);
  for (let i = 0; i < count2; ++i) {
    dots[i] = v2Dot(normal1, refEdge.poly2.normals[i]);
  }

  const i1 = dots.reduce((iMin, x, i, arr) => x < arr[iMin] ? i : iMin, 0);
  const i2 = i1 + 1 < count2 ? i1 + 1 : 0;

  return [
    { v: refEdge.poly2.vertices[i1], id: [ 0, 0, refEdge.index, i1 ] },
    { v: refEdge.poly2.vertices[i2], id: [ 0, 0, refEdge.index, i2 ] }
  ];
}

// ----------------------------------------------------------------------------
function collidePoly(polyA, polyB) {

  const edgeA = findMaxSeparation(polyA, polyB, 0);
  if (edgeA.maxSeparation > 0) {
    return;
  }

  const edgeB = findMaxSeparation(polyB, polyA, 1);
  if (edgeB.maxSeparation > 0) {
    return;
  }

  const referenceEdge = edgeB.maxSeparation > edgeA.maxSeparation ? edgeB : edgeA;
  const incidentEdge = findIncidentEdge(referenceEdge);

  const count1 = referenceEdge.poly1.vertexCount;
  const iv1 = referenceEdge.index;
  const iv2 = iv1 + 1 < count1 ? iv1 + 1 : 0;

  const vert1s = referenceEdge.poly1.vertices;
  const norm1s = referenceEdge.poly1.normals;
  const v11 = vert1s[iv1];
  const v12 = vert1s[iv2];
  const normal = norm1s[iv1];
  const perp = normal.perpendicular();

  clipSegmentToLine(incidentEdge, perp, v11, iv1);
  clipSegmentToLine(incidentEdge, perp.neg(), v12, iv2);

  let m = new Manifold(polyA, polyB);

  for (let i = 0; i < 2; ++i) {
    let separation = v2Distance(normal, v11, incidentEdge[i].v);
    if (separation <= 0.0) {
      let cp = new ContactPoint();
      cp.separation = separation;
      cp.position = incidentEdge[i].v;

      const id = incidentEdge[i].id;
      if (referenceEdge.flip) {
        cp.normal = normal.neg();
        cp.id = [ id[2], id[3], id[0], id[1] ];
      } else {
        cp.normal = normal.copy();
        cp.id = [ id[0], id[1], id[2], id[3] ];
      }

      m.contacts.push(cp);
    }
  }

  return m;
}
