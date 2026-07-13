export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const combineAliases = (aliases: string[] | undefined | null) => {
  if (!aliases || aliases.length === 0) {
    return null;
  }

  return aliases.join(", ");
};
