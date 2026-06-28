const fs = require('fs');

const prNumber = context.payload.pull_request?.number;
if (!prNumber) return;

const changedFiles = await github.paginate(
    github.rest.pulls.listFiles,
    { owner: context.repo.owner, repo: context.repo.repo, pull_number: prNumber }
);

const workspacePackageFiles = {
    'package.json': 'root',
    'backend/package.json': 'backend',
    'frontend/package.json': 'frontend',
};

const workspaceReports = {
    root: 'tmp/outdated.json',
    backend: 'tmp/outdated.json',
    frontend: 'tmp/outdated.json',
};

const affectedWorkspaces = Array.from(
    new Set(
        changedFiles
            .map((file) => workspacePackageFiles[file.filename])
            .filter(Boolean)
    )
);

if (affectedWorkspaces.length === 0) return;

const loadReport = (path) => {
    try {
        const content = fs.readFileSync(path, 'utf8').trim();
        if (!content) {
            return null;
        }
        return JSON.parse(content);
    } catch (error) {
        return { parseError: error instanceof Error ? error.message : String(error) };
    }
};

const results = affectedWorkspaces.map((workspace) => {
    const path = workspaceReports[workspace];
    const report = loadReport(path);
    return { workspace, report };
});

const buildPackageSection = (workspace, report) => {
    const workspaceName = workspace === 'root' ? 'root' : workspace;
    if (report == null) {
        return `#### ${workspaceName}\n- No outdated dependencies found or report file was empty.\n`;
    }

    if (typeof report.parseError === 'string') {
        return `#### ${workspaceName}\n- Failed to parse report: \`${report.parseError}\`.\n`;
    }

    if (Object.keys(report).length === 0) {
        return `#### ${workspaceName}\n- No outdated dependencies found.\n`;
    }

    const rows = Object.entries(report).map(([packageName, info]) => {
        const current = info.current ?? '-';
        const wanted = info.wanted ?? '-';
        const latest = info.latest ?? '-';
        return `| ${packageName} | ${current} | ${wanted} | ${latest} |`;
    });

    return [
        `#### ${workspaceName}`,
        '| Package | Current | Wanted | Latest |',
        '|---|---|---|---|',
        ...rows,
        '',
    ].join('\n');
};

const commentSections = [
    '### Dependency upgrade summary',
    'The following changed package files were detected in this PR. See below for outdated dependency details where present.',
    '',
];

for (const result of results) {
    commentSections.push(buildPackageSection(result.workspace, result.report));
}

commentSections.push('> This comment is informational and not a blocking check.');
commentSections.push('<!-- dependency-outdated-suggestion-marker -->');

const commentBody = commentSections.join('\n');

const comments = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
});

const existing = comments.data.find((comment) =>
    comment.body?.includes('dependency-outdated-suggestion-marker')
);

if (existing) {
    await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existing.id,
        body: commentBody,
    });
} else {
    await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: commentBody,
    });
}
