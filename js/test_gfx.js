// ----------------------------------------------------------------------------
function main()
{
  let mouseNode = document.createTextNode("");
  document.querySelector("#debug").appendChild(mouseNode);

  let mousePos = { u0: 0, u1: 0 };
  let mouseBlock = { u0: 0, u1: 0 };
  let campos = { u0: mousePos.u0, u1: mousePos.u1 };

  let player = {
    pos: { u0: 0, u1: 0 },
    frame: 0,
    dir: false
  };

  function onMouseMove(pos, buttons) {
    mousePos = { u0: pos.x, u1: pos.y };
    const cursor = wgl.screenToWorldCoords(mousePos);
    const x = Math.floor(cursor.u0 + 0.5);
    const y = Math.floor(cursor.u1 + 0.5);
    const z = world.getAt(x, y);
    mouseBlock = { u0: x, u1: y };
    mouseNode.nodeValue = `\u{1F5B0}(${mousePos.u0}, ${mousePos.u1}, ${buttons}) ${z}`;
  }

  function onMouseClick(pos, buttons) {
    mousePos = { u0: pos.x, u1: pos.y };
    mouseNode.nodeValue = `\u{1F5B0}(${mousePos.u0}, ${mousePos.u1}, ${buttons}) 1`;
    const cursor = wgl.screenToWorldCoords(mousePos);
    const x = Math.floor(cursor.u0 + 1.0);
    const y = Math.floor(cursor.u1 + 1.0);
    world.putAt(x, y, 0);
  }

  let dragStartPos = { u0: 0, u1: 0 };
  let dragCamStartPos = { u0: 0, u1: 0 };
  function onMouseDragStart(pos) {
    mousePos = { u0: pos.x, u1: pos.y };
    dragStartPos = mousePos;
    dragCamStartPos = campos;
    mouseNode.nodeValue = `\u{1F5B0}(${mousePos.u0}, ${mousePos.u1}) 1\n\u{1F4F9}(${campos.u0}, ${campos.u1}) 1`;
  }

  function onMouseDrag(pos) {
    mousePos = { u0: pos.x, u1: pos.y };
    campos = wgl.screenToWorldRatio({ u0: mousePos.u0 - dragStartPos.u0, u1: mousePos.u1 - dragStartPos.u1 });
    campos.u0 += dragCamStartPos.u0;
    campos.u1 += dragCamStartPos.u1;
    wgl.setCamera(campos);
    mouseNode.nodeValue = `\u{1F5B0}(${mousePos.u0}, ${mousePos.u1}) 1\n\u{1F4F9}(${campos.u0}, ${campos.u1}) 1`;
  }

  function onMouseDragEnd(pos) {
    mousePos = { u0: pos.x, u1: pos.y };
    mouseNode.nodeValue = `\u{1F5B0}(${mousePos.u0}, ${mousePos.u1}) 1`;
  }

  const canvas = document.querySelector("#glCanvas");
  let wgl = new WebGLRenderer(canvas);

  let mouse = initMouse(onMouseMove, onMouseClick, onMouseDragStart, onMouseDragEnd, onMouseDrag);

  const world = new WorldMap(wgl);

  function render(t_msec)
  {
    player.dir = mouseBlock.u0 < 6.5;
    if (player.dir) {
      player.pos.u0 -= 0.1;
    } else {
      player.pos.u0 += 0.1;
    }

    wgl.drawScene(world, t_msec, player, wgl.screenToWorldCoords(mousePos));
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();