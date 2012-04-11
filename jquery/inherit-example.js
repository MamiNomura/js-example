/**
 * Batch entry widget factory.
 */
(function(j$) {
    j$.convio = j$.convio || {};
    j$.convio.BatchEntryWidgetFactory = (function() {

        var _CONTAINER_PREFIX_ = '#field-container-';
        var _SPECIAL_LINK_TEXT_ = 'special-case-link-';
        var _HEADER_ROW_PREFIX_ = '#header-row-';

        // Custom widget class registry.
        // Anything not in here will get a DefaultWidget widget.
        var _widgetClasses = [];

        function registerWidgetClasses() {
            _widgetClasses["contact__c"] = ContactField;
            _widgetClasses["amount"] = AmountField;
        }

        // Widget registry.
        var _widgets = [];

        /**
         * Fetches a specific widget instance by name.
         */
        function getWidget(name) {
            var w = _widgets[name];
            if (! w) {
                alert("Widgets are not yet initialized or no such widget: name=" + name);
                return null;
            }
            return w;
        }


        // BatchEntryField default/parent class
        var DefaultWidget = j$.inherit({
            __constructor: function(data) {
                this._isRequired = data.isRequired || false;
                this._isLocked = data.locked || false ; 
                this._defaultValue = data.defaultValue;
                this._complexName = data.complexName;
                this._data = data;

                var id = this.id = data.fieldName.toLowerCase();      
                if (id.indexOf('__c') != -1) {
                    this.fieldName = id;
                } else {
                    this.fieldName = addNamespace(id)
                }

                // field element container
                this.field = j$(_CONTAINER_PREFIX_ + id);

            }, // end of constructor
            getFieldName: function() {
                return this.fieldName;
            },
            getComplexName: function() {
                return this._complexName;
            },
            getContainer: function() {       
                return j$(_CONTAINER_PREFIX_ + this.id);
            },
            getHeaderLabel: function() {
              return j$(_HEADER_ROW_PREFIX_ + this.getFieldName()).html();
            },

            /**
             * Update the DOM for the entry widget. Registers any events.
             */
            createField : function() {
                var t = this;

                var divInputElm = t.getContainer();
                if (divInputElm.length) {
                    if ( t._isRequired ) {                
                        var requiredElm = j$('<div>').addClass('requiredBlock');
                        divInputElm.prepend(requiredElm);
                    }       

                    if ( t._isLocked ) {
                        divInputElm.addClass('hidden');
                        var divElm = j$('<div>');
                        var lockedValue =  t._defaultValue;
                        divElm.text(lockedValue);
                        divInputElm.parent().append(divElm);

                    }
                }
            },

            /*
             * @param editRowData Data for all entry fields
             * @return string     Error text if there are any problems.
             */
            checkRequiredData: function(editRowData) {},

            /**
             * Converts data from frontend format to backend format.
             *
             * @param s The frontend value
             * @return The backend value
             */
            encodeString: function(s) {
                var dataType = this._data.dataType ? this._data.dataType.toLowerCase() : null;
                var value = s;
                if (value && value !== '') {
                    if (dataType === 'date') {
                        // Convert date values from MM/DD/YYYY to YYYY-MM-DD.
                        value = j$.convio.batch.Utils.encodeDate(value);
                    }
                }

                // Escape chars.
                if (value && typeof value == 'string') {
                    value = value.replace(/\|/g,'{PIPE}');
                    value = value.replace(/&/g, '{AMP}');
                    value = value.replace(/=/g, '{EQUAL}');
                }

                return value;
            },

            /**
             * Converts data from frontend backend format to frontend format.
             *
             * @param s The backend value
             * @return The frontend value
             */
            decodeString: function(s) {
                var dataType = this._data.dataType ? this._data.dataType.toLowerCase() : null;

                var value = s;
                if (value && value != '') {
                    if (dataType === 'date') {
                        // Convert date values from YYYY-MM-DD to MM/DD/YYYY.
                        value = j$.convio.batch.Utils.decodeDate(value);
                    }
                }
                return value;
            },

            /**
             * Generates a piece of the save string from the rowdata.
             *
             * @param rowdata The row data
             * @return The save string chunk
             */
            getSaveString: function(rowdata) {
                var fieldValue = rowdata[this.getFieldName()];
                var result = "";
                if (fieldValue && fieldValue !== '') {
                    result = this.getComplexName() + "=" + this.encodeString(fieldValue);
                }
                return result;
            },

            /**
             * Gets the value(s) from the entry widget. The values are used to update the row entry data.
             *
             * Override this method if the widget needs to return multiple values. 
             *
             * @return Either a) A string representing the entry widget's current value
             *         or     b) An associative array (object) representing multiple data values.
             *                   e.g., { foo: 'bar', bar: 'baz }
             */
            getWidgetValue: function() {
                var container = this.getContainer();
                var value = '';

                // The default implementation handles reading values
                // from a single standard Salesforce widgets:
                //    * select lists
                //    * textareas
                //    * checkboxes
                //    * input fields (e.g., text, date)
                var input = null;
                //if ((input = container.find('select option:selected')) && input.length) {
                if((input = container.find('select')) && input.length) {
                    var selectedOption = input.find('option:selected');
                    value = (selectedOption && selectedOption.length) ? selectedOption.val() : '';                
                } else if ((input = container.find('textarea')) && input.length) {
                    value = input.val();
                } else if ((input = container.find('input[type="checkbox"]')) && input.length) {
                    value = input.prop('checked') ? 'true' : 'false';
                } else if ((input = container.find('input')) && input.length) {
                    value = input.val();
                } else {
                    value = container.text();
                }

                return value;
            }, // end: getWidgetValue

            /**
             * Updates the widget state with the specified entry data.
             *
             * @param data Row entry data
             */
            setWidgetValue: function(data) {
                var valueStr = this.getData(data) || '';
                if (valueStr && typeof valueStr == 'string') {
                    // replace out &amp;
                    valueStr = valueStr.replace(/&amp;/g, '&');
                }

                var container = this.getContainer();

                var checkboxElm = container.find('input[type="checkbox"]');      
                if (checkboxElm.length) {
                    var isChecked = (valueStr && valueStr == 'true');
                    var checkedProp = '';
                    if (isChecked) {
                        checkedProp = 'checked';
                    }
                    checkboxElm.prop('checked', checkedProp);
                } else {
                    container.find(':input').val(valueStr);
                }
            },

            /**
             * Gets the display value for the field based on the row data.
             *
             * @param data The row data
             * @return The display value
             */
            getDisplayValue: function(data) {
                return data[this.fieldName];
            },

            /**
             * TODO: instead of this method here, wrap editRowData in an object to handle
             *       locked fields, and serialization behind the scenes.
             *
             * get data from editRowData for each field
             * @param editRowData   Data for the entire row
             * @return string       The value for the field.
             */
            getData : function(editRowData) {
                var t = this;
                // if field is locked, set back to default value and erase whatever they had in here.
                var valueStr;
                if ( t._isLocked ) {
                    valueStr = t._defaultValue;
                } else {
                    valueStr = editRowData[t.fieldName];
                }

                return valueStr;
            },
            
            /**
             */
            resetWidgetValue: function(rowData, currentWidgetValue) {
                // well for most of the widgets, there is nothing to do.
              return rowData;
            }            
        }); // end of DefaultWidget

        // child of DefaultWidget (amount)
        var AmountField = j$.inherit(DefaultWidget, {

            checkRequiredData : function(editRowData) {
                var t = this;
                // var amount = editRowData[t.fieldName];
                var amount = t.getWidgetValue();
                var dialogMessage = '';
                if(amount == undefined || amount.length == 0) {
                    dialogMessage += 'Please enter donation amount.';
                } else if(isNaN(parseFloat(amount))) {
                    dialogMessage += 'Please enter numeric value for donation amount.';
                }
                return dialogMessage;
            },
        });
 
        // status
        var StatusField = j$.inherit(DefaultWidget, {
            // override 
            setWidgetValue : function(editRowData) {
                var tableColumnElm = this.getContainer();
                var statusElm = null;
                switch(editRowData['isvalidated']) {
                case 'statusError':
                    statusElm = null;//getStatusErrorIconElm();
                    break;
                case 'statusReady':
                    statusElm = getStatusReadyIconElm();
                    break;
                case 'statusCommitted':
                    statusElm = getStatusCommitIconElm();
                    break;
                }
                tableColumnElm.html('');
                if(null != statusElm) {
                    statusElm.appendTo(tableColumnElm);
                }
                tableColumnElm.addClass('smallWidth');
            }
        });     


        registerWidgetClasses();

        return {
            /**
             * Creates a new widget and registers it.
             */
            getField: function(data) {      
                var batchField = null;


                // TODO: Refactor to make constructor argument-less.
                var name = removeNamespace(data.fieldName.toLowerCase());
                var widgetClass = _widgetClasses[name] || DefaultWidget;

                _widgets[name] = new widgetClass(data);

                return _widgets[name].field ? _widgets[name] : null;

            }
        };

    })();

})(jQuery);
