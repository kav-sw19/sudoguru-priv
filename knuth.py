from collections import defaultdict

class DLXNode:
    def __init__(self):
        self.left = self.right = self.up = self.down = self
        self.column = self
        self.name = None
        self.size = 0

class DLX:
    def __init__(self, matrix, header_names):
        self.header = DLXNode()
        self.nodes = []
        self.columns = {}
        self.solution = []
        last = self.header

        # Create header nodes
        for name in header_names:
            column = DLXNode()
            column.name = name
            column.size = 0
            column.up = column.down = column
            last.right = column
            column.left = last
            last = column
            self.columns[name] = column

        last.right = self.header
        self.header.left = last

        # Link rows
        for row in matrix:
            first = None
            for name in row:
                column = self.columns[name]
                node = DLXNode()
                node.column = column
                column.size += 1
                node.down = column
                node.up = column.up
                column.up.down = node
                column.up = node

                if first is None:
                    first = node
                    node.left = node.right = node
                else:
                    node.right = first
                    node.left = first.left
                    first.left.right = node
                    first.left = node
                self.nodes.append(node)

    def cover(self, column):
        column.right.left = column.left
        column.left.right = column.right
        for row in self.iterate(column, 'down'):
            for node in self.iterate(row, 'right'):
                node.down.up = node.up
                node.up.down = node.down
                node.column.size -= 1

    def uncover(self, column):
        for row in self.iterate(column, 'up'):
            for node in self.iterate(row, 'left'):
                node.column.size += 1
                node.down.up = node
                node.up.down = node
        column.right.left = column
        column.left.right = column

    def iterate(self, start, direction):
        node = getattr(start, direction)
        while node != start:
            yield node
            node = getattr(node, direction)

    def search(self):
        if self.header.right == self.header:
            return list(self.solution)

        # Choose the column with the fewest 1s
        col = self.header.right
        min_size = col.size
        node = col.right
        while node != self.header:
            if node.size < min_size:
                col = node
                min_size = node.size
            node = node.right

        self.cover(col)
        for row in self.iterate(col, 'down'):
            self.solution.append(row)
            for node in self.iterate(row, 'right'):
                self.cover(node.column)
            result = self.search()
            if result:
                return result
            self.solution.pop()
            for node in self.iterate(row, 'left'):
                self.uncover(node.column)
        self.uncover(col)
        return None

def sudoku_dlx_solver(puzzle_string):
    assert len(puzzle_string) == 81
    digits = '123456789'
    rows = 'ABCDEFGHI'
    cols = digits

    def cell_constraints(r, c): return f"cell {r}{c}"
    def row_constraints(r, d): return f"row {r} {d}"
    def col_constraints(c, d): return f"col {c} {d}"
    def box_constraints(b, d): return f"box {b} {d}"

    def box_index(r, c): return (r // 3) * 3 + (c // 3)

    matrix = []
    row_map = {}

    for r in range(9):
        for c in range(9):
            for d in range(1, 10):
                row_id = (r, c, d)
                box = box_index(r, c)
                matrix.append([
                    cell_constraints(r, c),
                    row_constraints(r, d),
                    col_constraints(c, d),
                    box_constraints(box, d)
                ])
                row_map[(r, c, d)] = matrix[-1]

    header_names = []
    for r in range(9):
        for c in range(9):
            header_names.append(cell_constraints(r, c))
    for r in range(9):
        for d in range(1, 10):
            header_names.append(row_constraints(r, d))
    for c in range(9):
        for d in range(1, 10):
            header_names.append(col_constraints(c, d))
    for b in range(9):
        for d in range(1, 10):
            header_names.append(box_constraints(b, d))

    # Create and feed DLX
    dlx = DLX(matrix, header_names)

    # Pre-fill known values
    for i, val in enumerate(puzzle_string):
        if val in digits:
            r, c, d = i // 9, i % 9, int(val)
            for node in dlx.columns[cell_constraints(r, c)].down,:
                if node.column.name != cell_constraints(r, c):
                    continue
                coords = []
                for right_node in dlx.iterate(node, 'right'):
                    coords.append(right_node.column.name)
                if row_constraints(r, d) in coords:
                    dlx.solution.append(node)
                    for n in dlx.iterate(node, 'right'):
                        dlx.cover(n.column)
                    dlx.cover(node.column)
                    break

    solution = dlx.search()
    if not solution:
        return None

    # Convert solution to grid string
    result = ['0'] * 81
    for node in solution:
        r, c, d = None, None, None
        entries = [node.column.name]
        for n in dlx.iterate(node, 'right'):
            entries.append(n.column.name)
        for entry in entries:
            if entry.startswith("cell"):
                r, c = map(int, entry.split()[1])
            elif entry.startswith("row"):
                d = int(entry.split()[2])
        result[r * 9 + c] = str(d)
    return ''.join(result)

import time

puzzle = "530070000600195000098000060800060003400803001700020006060000280000419005000080079"

start = time.time()
solution = sudoku_dlx_solver(puzzle)
end = time.time()

if solution:
    print("Solved Puzzle:")
    for i in range(0, 81, 9):
        print(solution[i:i+9])
    print(f"\nTime taken: {(end - start) }")
else:
    print("No solution found.")


