"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const services_1 = require("./services");
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const nitpickerFile = core.getInput('nitpickerFile');
            console.log(`Nitpicker file: ${nitpickerFile}`);
            const comments = services_1.getConfiguredComments(nitpickerFile);
            if ((_b = (_a = comments) === null || _a === void 0 ? void 0 : _a.length, (_b !== null && _b !== void 0 ? _b : 0)) == 0) {
                console.log('No comments are configured');
                return;
            }
            console.log(`There are ${comments.length} comments configured`);
            const token = core.getInput('token');
            const octokit = new github.GitHub(token);
            const eventName = process.env.GITHUB_EVENT_NAME;
            const changedFiles = yield services_1.getChangedFiles(octokit, eventName);
            const commentsToAdd = services_1.getCommentsToAdd(comments, changedFiles);
            yield services_1.writeComments(octokit, commentsToAdd, eventName);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
