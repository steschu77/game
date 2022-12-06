class Graph {
  constructor() {
    this.edges = {};
  }

  addNode(node) {
    this.edges[node] = [];
  }

  addEdge(n0, n1) {
    this.edges[n0].push(n1);
    this.edges[n1].push(n0);
  }

  searchShortestPathBFS(start, callback)
  {
    let steps = new Map();
    steps.set(start, null);

    let path = undefined;
    let q = [ start ];
    while (q.length > 0)
    {
      const from = q.shift();
      this.edges[from].forEach(to => {
        if (!steps.has(to)) {
          steps.set(to, from);
          if (callback(to)) {
            path = constructPath(steps, to);
            return;
          }
          q.push(to);
        }
      });
    }
    return path;
  }
}

// ----------------------------------------------------------------------------
// Find steps from n0 to n1 by reverse traversing steps from n1 to n0
function constructPath(steps, n) {

  let path = [];

  while (n != null) {
    path.unshift(n);
    n = steps.get(n);
  }

  return path;
}
