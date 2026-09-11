import "@testing-library/jest-dom";

// Canvas mock — jsdom doesn't support HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  strokeStyle: "",
  fillStyle: "",
  lineWidth: 0,
}));

// Note: jest.useFakeTimers() is NOT set globally here —
// only IssueVoucher.test.jsx uses fake timers locally