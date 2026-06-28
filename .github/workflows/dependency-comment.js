const prNumber = context.payload.pull_request?.number;
if (!prNumber) return;

const changedFiles = await github.paginate(
  github.rest.pulls.listFiles,
  { owner: context.repo.owner, repo: context.repo.repo, pull_number: prNumber }
);

const packageFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
];

if (!changedFiles.some((file) => packageFiles.includes(file.filename))) return;

const commentBody = [
  '💡 Suggestion: this PR modifies dependencies.',
  'Please run `npm outdated --json` in the relevant workspace and upgrade as needed.',
  'This is a suggestion only, not a hard block.',
  '<!-- dependency-outdated-suggestion-marker -->',
].join('\n');

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
