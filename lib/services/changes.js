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
function getChangedFiles(octokit, eventName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!eventName) {
            return [];
        }
        switch (eventName) {
            case 'push':
                return getChangedFilesFromSha(octokit);
            default:
                return getChangedFilesFromPR(octokit);
        }
    });
}
exports.getChangedFiles = getChangedFiles;
function getChangedFilesFromSha(octokit) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const beforeSha = github.context.payload.before;
        const afterSha = github.context.payload.after;
        const owner = (_b = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.owner) === null || _b === void 0 ? void 0 : _b.name;
        const repo = (_c = github.context.payload.repository) === null || _c === void 0 ? void 0 : _c.name;
        if (!beforeSha || !afterSha || !repo || !owner) {
            return [];
        }
        const listFilesResponse = yield octokit.repos.compareCommits({
            owner: owner,
            repo: repo,
            base: beforeSha,
            head: afterSha
        });
        const changedFiles = listFilesResponse.data.files.map(f => f.filename);
        core.debug('found changed files:');
        for (const file of changedFiles) {
            core.debug('  ' + file);
        }
        return changedFiles;
    });
}
function getChangedFilesFromPR(octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        const pullRequest = github.context.payload.pull_request;
        if (!pullRequest) {
            return [];
        }
        const listFilesResponse = yield octokit.pulls.listFiles({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: pullRequest.number
        });
        const changedFiles = listFilesResponse.data.map(f => f.filename);
        core.debug('found changed files:');
        for (const file of changedFiles) {
            core.debug('  ' + file);
        }
        return changedFiles;
    });
}
