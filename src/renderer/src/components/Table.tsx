import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { GetProp, PaginationProps, TableProps } from 'antd'
import { Button, Table, Tooltip } from 'antd'
import { ReactNode } from 'react'

type SizeType = TableProps['size']
type ColumnsType<T extends object> = GetProp<TableProps<T>, 'columns'>
type TablePagination<T extends object> = NonNullable<Exclude<TableProps<T>['pagination'], boolean>>
type TablePaginationPosition = NonNullable<TablePagination<any>['position']>[number]
type ExpandableConfig<T extends object> = TableProps<T>['expandable']
type TableRowSelection<T extends object> = TableProps<T>['rowSelection']

// Define a type for our custom options
export interface TableActionOption {
  label: string
  key: string
  icon: ReactNode
  disabled?: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const generateColumns = <T extends object>(
  data: Array<T> | any,
  onClick: (record: T, option?: any) => void,
  options?: TableActionOption[] | ((record: T) => TableActionOption[]),
  filterKeys?: (keyof T)[],
  linkKey?: string
) => {
  if (data.length === 0) return []

  let columns: ColumnsType<T> = []

  // If filterKeys is provided, create columns in the specified order
  if (filterKeys && filterKeys.length > 0) {
    columns = filterKeys.map((key) => {
      const column: any = {
        title: String(key)
          .replace(/(^|_)([a-z])/g, (_, _space, letter) => ' ' + letter.toUpperCase())
          .trim(),
        dataIndex: key,
        key: key
      }

      if (linkKey && column.key === linkKey) {
        column.render = (_: any, record: any) => (
          <a onClick={() => onClick(record, 'view')}>{record[linkKey]}</a>
        )
      }

      // Get example value from first item to determine data type
      const value = data[0][key]

      // Apply special rendering based on data type
      if (typeof value === 'string') {
        column['sorter'] = (a: T, b: T) => {
          const aValue = a[key as keyof T]
          const bValue = b[key as keyof T]
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue)
          }
          return 0
        }
      }

      if (typeof value === 'boolean') {
        column.render = (text: any) => (
          <span>
            {text ? (
              <CheckCircleOutlined
                style={{
                  backgroundColor: '#62cf7f',
                  borderRadius: '100%',
                  fontSize: 16,
                  color: '#000'
                }}
              />
            ) : (
              <CloseCircleOutlined
                color="#e66533"
                style={{
                  backgroundColor: '#eb374e',
                  borderRadius: '100%',
                  fontSize: 16,
                  color: '#000'
                }}
              />
            )}
          </span>
        )
      }

      return column
    })
  } else {
    // Original implementation when no filterKeys specified
    columns = Object.entries(data[0])
      .map(([key, value]) => {
        if (key === 'key') return null

        const column: any = {
          title: key
            .replace(/(^|_)([a-z])/g, (_, _space, letter) => ' ' + letter.toUpperCase())
            .trim(),
          dataIndex: key,
          key: key
        }

        if (linkKey && column.key === linkKey) {
          column.render = (_: any, record: any) => (
            <a onClick={() => onClick(record, 0)}>{record[linkKey]}</a>
          )
        }

        // validate value data type
        if (typeof value === 'string') {
          column['sorter'] = (a: T, b: T) => {
            const aValue = a[key as keyof T]
            const bValue = b[key as keyof T]
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return aValue.localeCompare(bValue)
            }
            return 0
          }
        }

        if (typeof value === 'boolean') {
          column.render = (text: any) => (
            <span>
              {text ? (
                <CheckCircleOutlined
                  style={{
                    backgroundColor: '#62cf7f',
                    borderRadius: '100%',
                    fontSize: 16,
                    color: '#000'
                  }}
                />
              ) : (
                <CloseCircleOutlined
                  color="#e66533"
                  style={{
                    backgroundColor: '#eb374e',
                    borderRadius: '100%',
                    fontSize: 16,
                    color: '#000'
                  }}
                />
              )}
            </span>
          )
        }

        return column
      })
      .filter((column) => column !== null)
  }

  // Add actions column
  if (options !== undefined) {
    columns.push({
      dataIndex: 'actions',
      key: 'actions',
      render: (_, record) => {
        // Get options for this specific record
        const recordOptions = typeof options === 'function' ? options(record) : options

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {recordOptions?.map((v: TableActionOption, i: number) => (
              <Tooltip key={i} title={v.label}>
                <Button
                  icon={v.icon}
                  onClick={() => onClick(record, v.key)}
                  style={{ marginRight: 10 }}
                  disabled={v.disabled}
                />
              </Tooltip>
            ))}
          </div>
        )
      }
    })
  }

  return columns
}

interface TableComponentProps<T extends object> {
  data: Array<T> | any
  columns: ColumnsType<T>
  pagination?: PaginationProps
  loading?: boolean
  bordered?: boolean
  size?: SizeType
  expandable?: ExpandableConfig<T>
  showHeader?: boolean
  showFooter?: boolean
  rowSelection?: TableRowSelection<T> | undefined
  tableLayout?: 'auto' | 'fixed' | 'unset'
  top?: TablePaginationPosition
  bottom?: TablePaginationPosition
  ellipsis?: boolean
  yScroll?: boolean
  xScroll?: 'unset' | 'scroll' | 'fixed'
}

const TableComponent = <T extends object>({
  data,
  columns,
  loading = false,
  bordered = false,
  size = 'small',
  pagination,
  expandable,
  showHeader = true,
  showFooter = false,
  rowSelection,
  tableLayout = 'unset',
  top = 'none',
  bottom = 'bottomRight',
  ellipsis = true,
  yScroll = false,
  xScroll = 'unset'
}: TableComponentProps<T>) => {
  const scroll: { x?: number | string; y?: number | string } = {}
  if (yScroll) {
    scroll.y = 240
  }
  if (xScroll !== 'unset') {
    scroll.x = '100vw'
  }

  const tableColumns = columns.map((item) => ({ ...item, ellipsis }))
  if (xScroll === 'fixed') {
    tableColumns[0].fixed = true
    tableColumns[tableColumns.length - 1].fixed = 'right'
  }

  const tableProps: TableProps<T> = {
    bordered,
    loading,
    size,
    expandable,
    showHeader,
    footer: showFooter ? () => <></> : undefined,
    rowSelection,
    scroll,
    tableLayout: tableLayout === 'unset' ? undefined : (tableLayout as TableProps['tableLayout'])
  }

  return (
    <Table<T>
      {...tableProps}
      pagination={{
        ...pagination,
        pageSizeOptions: [],
        position: [top, bottom]
      }}
      columns={tableColumns}
      dataSource={data}
      scroll={scroll}
    />
  )
}

export default TableComponent
