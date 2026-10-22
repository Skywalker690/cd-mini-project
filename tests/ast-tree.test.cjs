const test = require('node:test');
const assert = require('node:assert/strict');
const {compileSource} = require('../compiler.js');
const {project, layout} = require('../ast-tree.js');

const ast = source => compileSource(source).ast;

test('assignment diagram matches the reference: target and concatenation children', () => {
  const tree = project(ast('string name = "World"; string message; message = "Hello, " + name;').body[2]);
  assert.equal(tree.label, '=');
  assert.deepEqual(tree.children.map(n => n.label), ['message', '+']);
  assert.deepEqual(tree.children[1].children.map(n => n.label), ['"Hello, "', 'name']);
  assert.equal(tree.children[0].kind, 'target');
  const graph = layout(tree);
  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.links.length, 4);
  assert.ok(graph.nodes.find(n => n.label === 'message').x < graph.nodes.find(n => n.label === '+').x);
});

test('whole program includes declarations, uninitialized names and print expressions', () => {
  const tree = project(ast('string name = "Ada"; string message; print(name);'));
  assert.equal(tree.label, 'Program');
  assert.deepEqual(tree.children.map(n => n.label), ['=', 'string', 'print']);
  assert.equal(tree.children[0].description, 'Declaration');
  assert.equal(tree.children[0].children[0].label, 'name');
  assert.equal(tree.children[1].children[0].label, 'message');
  assert.equal(tree.children[2].children[0].label, 'name');
});

test('layout keeps ellipses inside the canvas, separates siblings and connects their boundaries', () => {
  const graph = layout(project(ast('string a = "A"; string b = "B"; print((a + b) + (a + b));')));
  const rows = new Map();
  for (const node of graph.nodes) {
    assert.ok(node.x - node.width / 2 >= 0 && node.x + node.width / 2 <= graph.width);
    assert.ok(node.y - node.height / 2 >= 0 && node.y + node.height / 2 <= graph.height);
    if (!rows.has(node.y)) rows.set(node.y, []);
    rows.get(node.y).push(node);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) assert.ok(row[i - 1].x + row[i - 1].width / 2 < row[i].x - row[i].width / 2);
  }
  for (const link of graph.links) {
    const parent = graph.nodes.find(n => n.id === link.from), child = graph.nodes.find(n => n.id === link.to);
    assert.ok(parent.y < link.y1 && link.y1 < link.y2 && link.y2 < child.y);
    const ellipse = (node, x, y) => ((x - node.x) / (node.width / 2)) ** 2 + ((y - node.y) / (node.height / 2)) ** 2;
    assert.ok(Math.abs(ellipse(parent, link.x1, link.y1) - 1) < 1e-8);
    assert.ok(Math.abs(ellipse(child, link.x2, link.y2) - 1) < 1e-8);
  }
});

test('collapsed branches hide descendants and can be expanded without changing the AST', () => {
  const original = ast('print("A" + ("B" + "C"));'), before = JSON.stringify(original);
  const tree = project(original);
  const all = layout(tree), collapsed = layout(tree, new Set([tree.id]));
  assert.equal(collapsed.nodes.length, 1);
  assert.equal(collapsed.links.length, 0);
  assert.equal(collapsed.nodes[0].collapsed, true);
  assert.equal(layout(tree).nodes.length, all.nodes.length);
  assert.equal(JSON.stringify(original), before);
});

test('long, escaped and HTML-like labels retain the full value as plain text', () => {
  const value = '<img src=x onerror=alert(1)>' + '🙂'.repeat(40) + '\n';
  const tree = project(ast('print(' + JSON.stringify(value) + ');').body[0]);
  const literal = tree.children[0];
  assert.equal(literal.text, JSON.stringify(value));
  assert.ok(Array.from(literal.label).length <= 25);
  assert.ok(literal.label.endsWith('…'));
  assert.ok(layout(tree).nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});

test('empty programs still have a visible Program root', () => {
  const graph = layout(project(ast('')));
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0].label, 'Program');
  assert.equal(graph.links.length, 0);
});

test('font-aware widths leave room for wide Unicode labels', () => {
  const tree = project(ast('print("' + '🙂'.repeat(22) + '");'));
  const graph = layout(tree, new Set(), () => 502);
  const literal = graph.nodes.find(n => n.description === 'String literal');
  assert.ok(literal.width >= 502 + 30, 'Node must accommodate the measured label width');
});

test('wide program connectors never cross an unrelated node ellipse', () => {
  const graph = layout(project(ast(Array.from({length: 20}, (_, i) => `print("${i}");`).join('\n'))));
  for (const edge of graph.links) {
    const points = edge.points || [{x: edge.x1, y: edge.y1}, {x: edge.x2, y: edge.y2}];
    for (const node of graph.nodes) {
      if (node.id === edge.from || node.id === edge.to) continue;
      for (let i = 1; i < points.length; i++) {
        const a = {x: (points[i-1].x-node.x)/(node.width/2), y: (points[i-1].y-node.y)/(node.height/2)};
        const b = {x: (points[i].x-node.x)/(node.width/2), y: (points[i].y-node.y)/(node.height/2)};
        const dx=b.x-a.x, dy=b.y-a.y, squared=dx*dx+dy*dy;
        const t=squared ? Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/squared)) : 0;
        assert.ok((a.x+t*dx)**2+(a.y+t*dy)**2 >= 1-1e-8, `Edge ${edge.from} → ${edge.to} crosses ${node.id}`);
      }
    }
  }
});

test('wide and deep valid programs have unique nodes and finite layout coordinates', () => {
  for (const source of [Array.from({length: 250}, (_, i) => `print("${i}");`).join('\n'), 'print(' + Array(120).fill('""').join('+') + ');']) {
    const graph = layout(project(ast(source)));
    assert.equal(new Set(graph.nodes.map(n => n.id)).size, graph.nodes.length);
    assert.equal(graph.links.length, graph.nodes.length - 1);
    assert.ok(graph.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
    assert.ok(Number.isFinite(graph.width) && Number.isFinite(graph.height));
  }
});
