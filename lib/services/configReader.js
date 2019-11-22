"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const js_yaml_1 = require("js-yaml");
function getConfiguredComments(filePath) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const yaml = js_yaml_1.safeLoad(contents);
    const comments = yaml.filter(y => { var _a; return y.markdown && ((_a = y.pathFilter) === null || _a === void 0 ? void 0 : _a.length) > 0; });
    return comments;
}
exports.getConfiguredComments = getConfiguredComments;
