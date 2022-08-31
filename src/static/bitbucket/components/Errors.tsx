import listStyles from './styles/listStyles';

type ErrorProps = {
  errors: string[];
};

const Errors = ({ errors }: ErrorProps) =>
  errors.length > 0 ? (
    <>
      <ul className={listStyles}>
        {errors.map((error) => (
          <li key={error} dangerouslySetInnerHTML={{ __html: error }} />
        ))}
      </ul>
    </>
  ) : null;

export default Errors;
