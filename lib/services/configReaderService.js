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
    console.log(contents);
    const yaml = js_yaml_1.safeLoad(contents);
    return yaml;
}
exports.getConfiguredComments = getConfiguredComments;
