import React from 'react';
import { Input, Tag } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

interface TagsInputProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  help?: string;
  existingTags?: string[];
}

const TagsInput: React.FC<TagsInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Type and press Enter to add tag',
  help,
  existingTags = [],
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!value.includes(newTag)) {
        onChange?.([...value, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      onChange?.(value.slice(0, -1));
    }
  };

  const handleClose = (removedTag: string) => {
    onChange?.(value.filter(tag => tag !== removedTag));
  };

  // Filter existing tags for autocomplete suggestions
  const filteredSuggestions = existingTags.filter(
    tag => tag.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(tag)
  );

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {value.map(tag => (
          <Tag
            key={tag}
            closable
            onClose={(e) => {
              e.preventDefault();
              handleClose(tag);
            }}
            closeIcon={<CloseOutlined style={{ fontSize: 10 }} />}
            style={{ padding: '2px 8px', marginBottom: 4 }}
          >
            {tag}
          </Tag>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add more tags...'}
          prefix={<PlusOutlined style={{ color: '#999' }} />}
          suffix={
            filteredSuggestions.length > 0 && inputValue ? (
              <span style={{ color: '#999', fontSize: 12 }}>
                {filteredSuggestions.length} suggestion{filteredSuggestions.length > 1 ? 's' : ''}
              </span>
            ) : null
          }
          list={existingTags.length > 0 ? 'tags-suggestions' : undefined}
        />
        {existingTags.length > 0 && inputValue && (
          <datalist id="tags-suggestions">
            {filteredSuggestions.slice(0, 10).map(tag => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        )}
      </div>
      {help && <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{help}</div>}
    </div>
  );
};

export default TagsInput;