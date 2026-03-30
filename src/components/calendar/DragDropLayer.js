const DragDropLayer = ({ isDragging }) => (
    <div className={`drag-drop-layer ${isDragging ? 'active' : ''}`}></div>
);

export default DragDropLayer;
