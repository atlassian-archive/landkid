type ErrorProps = {
  errors: string[];
};

const Errors = ({ errors }: ErrorProps) =>
  errors.length > 0 ? (
    <>
      <ul>
        {errors.map((error) => (
          <li key={error} dangerouslySetInnerHTML={{ __html: error }} />
        ))}
      </ul>
    </>
  ) : null;

export default Errors;
