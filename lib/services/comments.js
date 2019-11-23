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
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const minimatch_1 = require("minimatch");
function getCommentsToAdd(allComments, changedFiles) {
    const commentsToAdd = [];
    for (const comment of allComments) {
        let matchedComment = false;
        for (const pathFilter of comment.pathFilter) {
            core.debug(` checking pattern ${pathFilter}`);
            const matcher = new minimatch_1.Minimatch(pathFilter);
            for (const changedFile of changedFiles) {
                core.debug(` - ${changedFile}`);
                if (matcher.match(changedFile)) {
                    commentsToAdd.push(comment);
                    matchedComment = true;
                    core.debug(` ${changedFile} matches`);
                    break;
                }
            }
            if (matchedComment) {
                break;
            }
        }
    }
    return commentsToAdd;
}
exports.getCommentsToAdd = getCommentsToAdd;
function writeComments(octokit, comments, eventName) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        if (eventName !== 'pull_request') {
            console.log('we will only nitpick pull requests');
            return;
        }
        const pullRequest = github.context.payload.pull_request;
        const owner = (_b = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.owner) === null || _b === void 0 ? void 0 : _b.name;
        const repo = (_c = github.context.payload.repository) === null || _c === void 0 ? void 0 : _c.name;
        if (!pullRequest || !owner || !repo) {
            return;
        }
        yield Promise.all(comments.map(comment => {
            octokit.issues.createComment({
                repo: repo,
                owner: owner,
                issue_number: pullRequest.number,
                body: comment.markdown
            });
        }));
    });
}
exports.writeComments = writeComments;
