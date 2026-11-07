const React = require('react');

module.exports = new Proxy({}, {
  get(_target, property) {
    if (property === '__esModule') return false;
    const name = String(property);
    const MockIcon = (props) => React.createElement(
      'svg',
      { 'aria-hidden': true, 'data-lucide': name, ...props }
    );
    MockIcon.displayName = name;
    return MockIcon;
  },
});
