const Table = ({
  columns = [],
  data = [],
  getRowKey,
  emptyMessage = 'No hay información para mostrar.',
}) => {
  if (!data.length) {
    return (
      <div className="ui-table-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="ui-table-wrapper">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.align ? `text-${column.align}` : ''}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={getRowKey ? getRowKey(row) : row.id || rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                  className={column.align ? `text-${column.align}` : ''}
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;