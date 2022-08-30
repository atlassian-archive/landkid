type WarningProps = {
  warnings: string[];
};

const Warnings = ({ warnings }: WarningProps) =>
  warnings.length > 0 ? (
    <>
      <p>
        Warnings: <em>(these will not prevent landing)</em>
      </p>
      <ul>
        {warnings.map((warning) => (
          <li key={warning} dangerouslySetInnerHTML={{ __html: warning }} />
        ))}
      </ul>
    </>
  ) : null;

export default Warnings;
