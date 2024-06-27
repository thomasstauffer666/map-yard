import { Bezier } from "./bezier/bezier.js";

function createCircle(x, y) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  e.setAttribute("cx", x);
  e.setAttribute("cy", y);
  e.setAttribute("r", 5);
  e.setAttribute("style", "fill:red");
  return e;
}

function createLine(x1, y1, x2, y2) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", "line");
  e.setAttribute("x1", x1);
  e.setAttribute("y1", y1);
  e.setAttribute("x2", x2);
  e.setAttribute("y2", y2);
  e.setAttribute("style", "stroke:red");
  return e;
}

function createImageElement(href) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", "image");
  e.setAttribute("href", href);
  return e;
}

function main() {
  // https://www.freepik.com/free-vector/vintage-monochrome-mountains-set_7997411.html
  const mountain1 = createImageElement("mountain1.svg");
  const mountain2 = createImageElement("mountain2.svg");
  const mountain3 = createImageElement("mountain1.svg");

  const mountains = [mountain1, mountain2, mountain3];

  // TODO sort by y and then x?

  for (let i = 0; i < 2; i += 1) {
    const points =
      i == 0
        ? [
            [200, 50],
            [500, 200],
            [400, 400],
          ]
        : [
            [100, 500],
            [500, 300],
            [400, 600],
          ];
    const bezier = new Bezier(points[0].concat(points[1]).concat(points[2]));

    const svg = document.getElementById("svg");

    for (let i = 0; i <= 100; i += 5) {
      let t = i / 100;
      const index = Math.floor(Math.random() * mountains.length);
      const mountain = mountains[index];
      const node = mountain.cloneNode(true);
      const xScale = 0.5 * Math.random() + 1;
      const yScale = 0.5 * Math.random() + 1;
      const p = bezier.get(t);
      const x = p.x;
      const y = p.y;
      node.setAttribute("transform", "translate(" + x + " " + y + ") scale(" + xScale + " " + yScale + ")");
      svg.appendChild(node);
    }

    svg.appendChild(createCircle(...points[0]));
    svg.appendChild(createCircle(...points[1]));
    svg.appendChild(createCircle(...points[2]));
    svg.appendChild(createLine(...points[0], ...points[1]));
    svg.appendChild(createLine(...points[1], ...points[2]));
  }
}

document.addEventListener("DOMContentLoaded", main);
