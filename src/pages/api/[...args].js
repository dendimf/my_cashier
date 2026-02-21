const app = require('../../../backend/src/index');

export default function handler(req, res) {
    return app(req, res);
}
