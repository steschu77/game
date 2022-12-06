// ----------------------------------------------------------------------------
function initInput()
{
  let player = {
    forceX0: 0, forceX1: 0,
    forceY0: 0, forceY1: 0
  };

  function keyDownHandler(event) {
    let x = event.which || event.keyCode;
    switch (x) {
      case 37: player.forceX1 = 1; break;
      case 39: player.forceX0 = 1; break;
      case 40: player.forceY0 = 1; break;
      case 38: player.forceY1 = 1; break;

      case 49: player.inventorySlot = 1; break;
      case 50: player.inventorySlot = 2; break;
      case 51: player.inventorySlot = 3; break;
      case 52: player.inventorySlot = 4; break;
      case 53: player.inventorySlot = 5; break;
    }
  }

  function keyUpHandler(event) {
    let x = event.which || event.keyCode;
    switch (x) {
      case 37: player.forceX1 = 0; break;
      case 39: player.forceX0 = 0; break;
      case 40: player.forceY0 = 0; break;
      case 38: player.forceY1 = 0; break;
    }
  }

  document.addEventListener('keydown', keyDownHandler, false);
  document.addEventListener('keyup', keyUpHandler, false);

  return player;
}

// assumes target or event.target is canvas
function getRelativeMousePosition(event, target) {
  const rect = target.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * target.width / canvas.clientWidth,
    y: (event.clientY - rect.top) * target.height / canvas.clientHeight
  };
}

function initMouse(onMove, onClick, onDragStart, onDragEnd, onDrag)
{
  const canvas = document.querySelector("#glCanvas");
  let dragging = false;

  function mouseMoveHandler(event) {
    let pos = getRelativeMousePosition(event, event.target);
    if ((event.buttons & 1) != 0) {
      if (!dragging) {
        onDragStart(pos);
        dragging = true;
      } else {
        onDrag(pos);
      }
    } else {
      onMove(pos);
    }
  }

  function mouseUpHandler(event) {
    let pos = getRelativeMousePosition(event, event.target);
    if (dragging) {
      onDragEnd(pos);
      dragging = false;
    }
    onClick(pos, event.buttons);
  }

  canvas.addEventListener('mousemove', mouseMoveHandler);
  canvas.addEventListener('mouseup', mouseUpHandler);
}