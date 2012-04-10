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
            _widgetClasses["closedate"] = CloseDateField;
            _widgetClasses["payment_type__c"] = PaymentTypeField;
            _widgetClasses["recordtypeid"] = RecordTypeField;
            _widgetClasses["amount"] = AmountField;
            _widgetClasses["campaignid"] = CampaignField;
            _widgetClasses["segment_code__c"] = SegmentCodeField;
            _widgetClasses["donor_external_id"] = DonorIdField;
            _widgetClasses["designation__c"] = DesignationField;
            _widgetClasses["opengift"] = OpenDonationWidget;
            _widgetClasses["softcredits"] = SoftCreditsWidget;
            _widgetClasses["giftassets"] = GiftAssetsWidget;
            _widgetClasses["num"] = NumField;
            _widgetClasses["status"] = StatusField;
            _widgetClasses["gifttype"] = GiftTypeWidget;
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


        // child of DefaultWidget (designation__c)
        var DesignationField = j$.inherit(DefaultWidget, {
            createField: function() {
                var t = this;

                this.getContainer().html('');

                this.__base();

                var input = j$('<input>')
                    .attr('id', 'designation-autocomplete')
                    .autocomplete({
                        source: Convio.BatchPageUtils.designationNameList,
                        delay: 10,
                        create: function(event, ui) {
                            if(event) {
                                j$(event.target).val();
                            }
                        }
                    })
                    .appendTo(t.getContainer());
                
                var outer = j$('<span>')
                    .addClass('specialCase')
                    .appendTo(this.getContainer());
                
                var innerA = j$('<span>')
                    .addClass('specialContent')
                    .appendTo(outer);
                
                var innerB = j$('<span>')
                    .addClass('specialContentInput')
                    .addClass('hidden')
                    .appendTo(outer);

                var a = j$('<a>')
                    .addClass('specialContentLink')
                    .prop('id', _SPECIAL_LINK_TEXT_ + t.fieldName)
                    .attr('href', 'javascript:void(0);')
                    .html('[Split]')
                    .click(function(e) { 
                        t.showMultiDesignationDialog(e.currentTarget); 
                    })
                    .appendTo(outer);
            },

            /**
             * Updates the widget value based on the dialog submission.
             */
            showMultiDesignationDialog: function(selectedElement) {
                var t = this;

                // Fetch amount value.
                var rowAmount = getWidget('amount').getWidgetValue() || 0;
                rowAmount = parseFloat(rowAmount);
                if (isNaN(rowAmount)) {
                    rowAmount = 0;
                }

                // Fetch designation value.
                var desValue = this.getWidgetValue();

                // Initial values.
                var o = {
                    rowAmount: rowAmount,
                    desValue: desValue
                };

                Convio.MultiDesignationWidget.show(o, function(result) {
                    t._setWidgetValue(result.designationString);
                }, getReturnFocusFunction(selectedElement));
            },

            getWidgetValue: function() {
                var input = this.getContainer().find('#designation-autocomplete');
                var isMultiDesignations = input.hasClass('hidden');
                var value = null;
                if (isMultiDesignations) {
                    value = this.getContainer().find('.specialContentInput').html(); 
                } else {
                    value = input.val();
                    value = j$.convio.batch.Utils.encodeDesignation(value);
                }
                return value;
            },

            setWidgetValue: function(editRowData) {
                var valueStr = this.getData(editRowData) || '';
                this._setWidgetValue(valueStr);
            },

            /**
             * Sets the designation input to the specified value.
             */
            _setWidgetValue: function(valueStr) {
                var value = valueStr;
                if (value && typeof value === 'string') {
                    // replace out &amp;
                    value = value.replace(/&amp;/g, '&');
                }

                // Toggle single/multi -designations mode.
                var multiDesignationDisplay = this.getContainer().find('.specialContent');
                var input = this.getContainer().find('#designation-autocomplete');

                var selectedDesignations = value.split(';');        
                var isMultipleDesignations = (selectedDesignations.length > 1);
                if (isMultipleDesignations) {
                    // Hide the input, show the multi-des display.
                    input.addClass('hidden').val('');
                    multiDesignationDisplay.html('' + selectedDesignations.length + ' Designations');

                    this.getContainer().find('.specialContentInput').html(valueStr);
                } else {
                    // Hide the multi-des display. Show the input.
                    input.removeClass('hidden').val(j$.convio.batch.Utils.decodeDesignation(value));
                    multiDesignationDisplay.html('');
                }
            },
            getDisplayValue: function(data) {
              var value = this.__base(data);
              if(value) {
                var selectedDesignations = value.split(';');        
                if (selectedDesignations.length > 1) {
                  // Hide the input, show the multi-des display.
                  value = selectedDesignations.length + ' Designations';
                }
              }
              return j$.convio.batch.Utils.decodeDesignation(value);
            }

        }); // end of DesignationField

        // child class of DefaultWidget (campaignid)
        var CampaignField =  j$.inherit(DefaultWidget, {
            createField: function() {
                var t = this;

                // Get rid of the default salesforce widget.
                t.getContainer().html('');

                this.__base();

                var autoCompleteField = j$('<input>')
                    .attr('id', 'campaign-autocomplete')
                    .autocomplete({
                        source: Convio.BatchPageUtils.campaignNameList,
                        delay: 10,
                        create: function(event, ui) {
                            if(event) {
                                j$(event.target).val();
                            }
                        }
                    })
                    .appendTo(t.getContainer());
            },

            checkRequiredData: function(editRowData) {
                var t = this;
                // var campaignName = editRowData[t.fieldName];
                var campaignName = t.getWidgetValue();
                var dialogMessage = '';
                if(campaignName == undefined || campaignName.length == 0) {
                    dialogMessage += 'Error: Please select a campaign.</br>';
                }
                return dialogMessage;
            }

        });


        // child class of DefaultWidget (closedate)
        var CloseDateField = j$.inherit(DefaultWidget, {

            checkRequiredData : function(editRowData) {
                var t = this;
                // var closeDate = editRowData[t.fieldName];
                var closeDate = t.getWidgetValue();
                var dialogMessage = '';               
                var closeDt = t._stringToDate(closeDate);
                if(!closeDt) {
                    dialogMessage += 'Please enter a valid close date.';
                }
                return dialogMessage;
            },

            _stringToDate : function(dateString) {
                var t = this;
                try {
                    if(dateString == undefined || dateString.length == 0) return false;
                    var matches = dateString.match(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})/);
                    if(t._isValidDate(matches[3], matches[1], matches[2]) === false) {
                        return false;
                    }

                    return new Date(parseInt(matches[3], 10), parseInt(matches[2], 10)-1, parseInt(matches[1], 10));
                } catch(e) {
                    return false;
                }                    
            },
            _isValidDate : function(year, month, day) {
                var dt = new Date(parseInt(year, 10), parseInt(month, 10)-1, parseInt(day, 10));
                if(dt.getDate() != parseInt(day, 10) || dt.getMonth() != (parseInt(month, 10)-1) || dt.getFullYear() != parseInt(year, 10)) {
                    return false;
                }
                return true;
            }
        });

        // child class of DefaultWidget (contact__c) 
        var ContactField = j$.inherit(DefaultWidget, {
            contactInfo: {}, // contact info contains the following attributes
            setContactValue: function(name) {
                var contactInput = this.getContainer().find(':input')
                    .val(name);
            },
            // name, id, isLead, accountId
            getContactInfo: function() {
                return this.contactInfo;
            },
            setContactInfo: function(newContactInfo) {
                this.contactInfo = newContactInfo;
            },
            getDisplayValue: function(data) {
                return data.validatedcontact;
            },
            // override getData
            setWidgetValue : function(editRowData) {
                // contact field cannot be locked or given default value so base implementation can be ignored.
                // construct contact info
                var contactInfo = {
                    id: editRowData.contact__c,
                    accountId: editRowData.accountid,
                    name: editRowData.validatedcontact,
                    // defaults to false. only the External Donor ID Widget sets isLead to true.
                    isLead: false
                };

                this.setContactInfo(contactInfo);
                this.setContactValue(contactInfo.name);
            },

            createField : function() {
                var t = this;
                var f = t.getContainer();

                function _replacePicker() {
                    var editContactDiv = j$('<div>').addClass('input-item-class');
                    editContactDiv.addClass('divWithIcon');
                    var editContactInput = j$('<input>').prop('id', 'selectedContactName').prop('type', 'text');
                    editContactInput.appendTo(editContactDiv);
                    f.html('');
                    editContactDiv.appendTo(f);
                    var editContactAtag = j$('<a>').prop('id', 'searchContactsButton').prop('href', 'javascript:void(0);');
                    getLookupIconElm().appendTo(editContactAtag);
                    editContactAtag.appendTo(editContactDiv);

                }

                _replacePicker();   
                this.__base();

                f.find('#searchContactsButton').click(function(e) {
                    t.searchContactEvent(e.target);
                });
                f.find('input#selectedContactName').keypress(function(e) {
                    switch(e.keyCode) {
                    case 13: // enter
                        t.searchContactEvent(e.target);
                        e.preventDefault();
                        break;
                    }
                });
            },
            searchContactEvent : function(returnFocusTarget, errorString) {
                var t = this;
                
                var contactInput = t.getContainer().find(':input');
                
                var searchName = '';
                if(contactInput.length) {
                    searchName = contactInput.val();
                }
                // get type, format
                var type = getWidget('type').getWidgetValue(); // donation type widget value
                if (type === "Individual Gift") {
                    type = "individual"; 
                } else if (type === "Organization Gift") {
                    type = "organization";
                } else {
                    throw "unknown type in batch row: " + type;
                }

                Convio.ContactSearchWidget.show({
                    search: searchName,
                    selectCallback: function (result) {
                        if (result === undefined) {
                            throw {
                                name: "BatchException",
                                message: "contact widget fired select handler but did not return selection"
                            }
                        }
                        var newEditContactInfo = {
                            name: result.Name,
                            id: result.Id,
                            // defaults to false. only the External Donor ID Widget sets isLead to true.
                            isLead: false, 
                            accountId: result.AccountId
                        };

                        var updateEditContactInfo = function() {
                            t.setContactInfo(newEditContactInfo);
                            t.setContactValue(newEditContactInfo.name);
                            Convio.BatchPageUtils.editContactInfo = newEditContactInfo;
                        }
                        var parentRowElms = t.getContainer().parents('tr.dataRow');
                        var editRowData = null;
                        for(var i in parentRowElms) {
                            var parentRowElm = j$(parentRowElms[i]);
                            if(parentRowElm.hasClass('editDataRow')) {
                                editRowData = parentRowElm.data('data');
                                break;
                            }
                        }
                        var oldEditContactInfo = t.getContactInfo(); 
                        if(editRowData.opportunityid && oldEditContactInfo.id != newEditContactInfo.id) {
                            var okCallback = function() {
                                // reset specific data
                                editRowData.opportunityid = null;
                                editRowData.opengift = null;
                                editRowData.opengift_specialFieldInfo = null;
                                editRowData.checkforopengifts = 'true';
                                // update the editRowData associated with the row
                                //Convio.BatchPageUtils.getCurrentEditRow().data('data', editRowData);
                                // get open gift field and fill in with blank
                                var editGiftElm = j$('#edit-row-opengift');
                                if(editGiftElm.length) {
                                    clearSpecialFieldInput(editGiftElm);
                                    updateEditContactInfo();
                                }
                            }
                            var buttons = {
                                'Yes': okCallback,
                                'No': null
                            }
                            var errorString = 'An open donation has already been selected for a different donor.  <br.>';
                            errorString += 'Are you sure you want to change the donor and remove the selected open donation?'; 
                            Convio.ErrorInfoUtils.showDialog(errorString, buttons, returnFocusTarget, errorString);
                        } else {
                            updateEditContactInfo();
                        }
                    },
                    closeCallback: getReturnFocusFunction(returnFocusTarget),
                    type: type,
                    errorMessage: errorString
                }
                                               );
            },

            getWidgetValue: function() {
                // The contact widget returns multiple values.

                var newValue = null;
                var value = this.__base();
                if (value && value !== '') {
                    // Copy contact info.

                    var editContactInfo = this.getContactInfo();

                    var newValue = {
                        accountid: editContactInfo.accountId,
                        validatedcontactid: editContactInfo.id,
                        validatedcontact: editContactInfo.name
                    };
                    newValue['contact__c'] = editContactInfo.id;
                }

                return newValue;
            },

            checkRequiredData : function(editRowData) {
                var t = this;
                //var contactId = editRowData[t.fieldName];
                var contactInfo = t.getWidgetValue();             
                var dialogMessage = '';
                
                if(!contactInfo || contactInfo == undefined || !contactInfo.validatedcontactid) {
                    dialogMessage += 'Error: Please search and select contact record.';
                }
                /*if(contactId == undefined || contactId.length == 0) {
                    dialogMessage += 'Error: Please search and select contact record.</br>';
                }*/
                return dialogMessage;
            }
        }); // end of ContactField


        // child class of DefaultWidget (payment_type__c)
        var PaymentTypeField = j$.inherit(DefaultWidget, {
            createField: function() {
                this.__base();

                // register click handler on this field 
                var f = this.getContainer();
                var t = this;
                f.find('select').change(function(event) {
                    var selectedValue = this.options[this.selectedIndex].value;
                    Convio.ErrorInfoUtils.clearInlineMessages();
                    var paymentTypeData = t.getWidgetValue();
                    paymentTypeData = paymentTypeData || {};
                    if(selectedValue == 'ACH' || selectedValue == 'Credit Card') {
                        t.checkRequiredDataAndOpenPaymentPage();              
                    } else {
                        t.closePaymentPage(null, paymentTypeData.authtransactionid, paymentTypeData.processed_offline);
                    }
                });
            },
            
            checkRequiredDataAndOpenPaymentPage: function() {
                var t = this;
                var activeRow = Convio.BatchPageUtils.getActiveRow();
                var editRowData = activeRow.data('data');
                
                var paymentTypeData = t.getWidgetValue();                    
                var authTransactionId = paymentTypeData.authtransactionid;
                var processedOffline = paymentTypeData.processed_offline;

                // transactionId.
                var transactionId = parseInt(authTransactionId);
                if(isNaN(transactionId)) {
                    transactionId = -1;
                }
                
                Convio.ErrorInfoUtils.clearInlineMessages();

                if(transactionId <=0 && processedOffline != 'true') {
                    var errorMsgMap = t.checkRequiredData(editRowData);
                    if(errorMsgMap) {
                        var errorFound = false;
                        j$.each(errorMsgMap, function(key, value) {
                            var widget = getWidget(key);
                            var focusElm = widget.getContainer().find('input,select,a').filter(':visible:first');
                            Convio.ErrorInfoUtils.showInlineError(value, focusElm, true);
                            errorFound = true;
                            return false;
                        });
                        
                        if(errorFound) {
                            t.closePaymentPage(null, authTransactionId, processedOffline);
                            return;
                        }
                    }

                    Convio.ErrorInfoUtils.clearInlineMessages();
                    var executeSaveCallback = function(result, event) {
                        if(event && event.status && event.result) {
                            var result = event.result;
                            if(result.isSaved) {
                                //Convio.BatchPageUtils.openPaymentPage(result.batchEntryId);
                                t.openPaymentPage(result.batchEntryId);
                            }
                        }
                    };

                    Convio.BatchPageUtils.saveAndReloadRow(null, executeSaveCallback);
                }
            },

            getWidgetValue: function() {
                var value = {};
                value[this.getFieldName()] = this.__base();

                // The payment widget also sets values for authid and offline processing.
                var container = this.getContainer();
                var authTransactionIdStr = container.find('input[type=hidden]#authTransactionId').val();
                var processedOffline = container.find('input[type=hidden]#processedOffline').val();

                var authTransactionId = parseInt(authTransactionIdStr);
                if (authTransactionId && !isNaN(authTransactionId)) {
                    value['authtransactionid'] = authTransactionId;
                }
                
                if (processedOffline && processedOffline === 'true') {
                    value['processed_offline'] = processedOffline;
                }

                return value;
            },

            // override set row data.
            setWidgetValue: function(editRowData) {
                var t = this;
                var paymentInfo = t.getData(editRowData);
                var valueStr = paymentInfo.fieldValue;
                t.getContainer().find('select option').removeAttr('selected');
                t.getContainer().find('select option[value=\'' + valueStr + '\']').attr('selected', true);

                var parentEl = j$(t.field[0]).closest('tr.dataRow')
                t.renderPaymentTypeField(paymentInfo, parentEl);
            },
            
            getDisplayValue: function(data) {
              var t = this;
              var value = this.__base(data);
              if(value) {
                  var parentEl = j$('<td></td>');
                  
                  var paymentTypeValueDivEl = j$('<div>' + value + '</div>');
                  paymentTypeValueDivEl.appendTo(parentEl);                  
                  
                  var paymentFieldData = t.getData(data);
                  t.renderPaymentTypeField(paymentFieldData, parentEl);
                  return parentEl.html();
              }
              return value;
            },
            
            resetWidgetValue: function(rowData, currentWidgetValue) {
                var t = this;
                var newPaymentTypeFieldData = t.getData(rowData);
                if(null == currentWidgetValue ||
                   currentWidgetValue != newPaymentTypeFieldData.fieldValue) {
                    rowData['authtransactionid'] = null;
                    rowData['processed_offline'] = null;    
                }
                return rowData;
            },
                        
            // override getData method
            getData : function(editRowData) {   
                var newValue = this.__base(editRowData);
                var paymentInfo = {};
                paymentInfo.rowNum = editRowData.rowix;
                paymentInfo.authTransactionId = editRowData['authtransactionid'];
                paymentInfo.processedOffline = editRowData['processed_offline'];
                paymentInfo.fieldValue = newValue;
                paymentInfo.batchEntryId = editRowData['batchEntryId'];
                newValue = paymentInfo;  
                return newValue;
            },
            
            getSaveString: function(rowdata) {
                var fieldValue = rowdata[this.getFieldName()];
                var result = "";
                if (fieldValue && fieldValue !== '') {
                    result = this.getComplexName() + "=" + this.encodeString(fieldValue);
                }
                
                // auth transactionId
                var authTransactionId = rowdata.authtransactionid;
                if(null != authTransactionId) {
                    result += '&authTransactionId=' + authTransactionId;
                }
                
                // processed_offline
                var processedOffline = rowdata.processed_offline;
                if(processedOffline && processedOffline == 'true') {
                    result += '&processed_offline=' + processedOffline;
                }
                return result;
            },
            
            checkRequiredData : function(editRowData) {
                var t = this;
                var requiredWidgets = [getWidget('contact__c'),
                                       getWidget('amount'),
                                       getWidget('campaignid'),
                                       getWidget('closedate')
                                      ];
                                      
                var errorMsgMap = {};
                j$.each(requiredWidgets, function() {
                    var widget = this;
                    var widgetErrorMessage = widget.checkRequiredData(editRowData);
                    if(widgetErrorMessage) {
                        errorMsgMap[widget.getFieldName()] = widgetErrorMessage;                        
                    }
                });
                return errorMsgMap;
            },
            
            openPaymentPage : function(batchEntryId, rowNum) {
                var selectedRow = null;
                var selectedRowNum = null;
                if(rowNum) {
                   // get row some how.
                   selectedRow = j$('#batch-row-' + rowNum);
                }
        
                if(!selectedRow) {
                    selectedRow = Convio.BatchPageUtils.getActiveRow();
                }
          
               if(selectedRow) {
                   selectedRowNum = getWidget('num').getWidgetValue();
                   // lets remove payment page row before adding one.
                   j$('tr#payment_page_row').remove();
                   // add table row.
                   var numOfColumns = Convio.BatchPageUtils.getBatchFields().length;
                   selectedRow.after('<tr id="payment_page_row"><td id="payment_page_col" colspan="' + (numOfColumns-2) + '"><div id="payment_iframe_loading" style="position:relative; z-index:9999;">Loading Payment Page ...</div></td></tr>');
                 
                   var getPaymentPageUrlCallback = function(result, event) {
                       if(event && event.status && event.result) {
                           var result = event.result;
                           if(result) {
                               // selectedRow.after('<tr id="payment_page_row"><td id="payment_page_col" colspan="' + (batchFields.numColumns-2) + '"><div id="payment_iframe" style="position:relative; z-index:9999;">' + j$('#payment-page-panel').html() + '</div></td></tr>');
                               var iframeSrc = '<div id="payment_iframe" class="hidden">' + j$('#payment-page-panel').html() + '</div>';
                               j$(iframeSrc).appendTo('#payment_page_col');
                               j$('#payment_page_row').find('iframe').attr('src', result);
                               j$('#new-batch-item-form').scrollLeft(0);
                           }
                       } else {
                           j$('#payment_iframe_loading').html('Payment page could not be loaded');
                       }
                   };
                   getController().getPaymentPaneUrl(batchEntryId, getBatchId(), selectedRowNum, getCRMHost(), getPaymentPageUrlCallback);
               }
            },
            
            showPaymentPage: function() {
                // Convio.BatchPageUtils.originalScrollTop = j$('#new-batch-item-form').scrollTop();
                var iframeEl = j$('#payment_page_row').find('iframe');
                j$('#payment_page_row').find('#payment_iframe_loading').addClass('hidden');
                j$('#payment_page_row').find('#payment_iframe').removeClass('hidden');
                var windowHeight = Math.ceil(j$(window).height());
                var iframeHeight = Math.ceil(iframeEl.height());
                var iframeTop = Math.ceil(iframeEl.offset().top);
                var batchItemFormHeight = Math.ceil(j$('#new-batch-item-form').height());
                var batchItemFormTop = Math.ceil(j$('#new-batch-item-form').offset().top);
                var paddingBottom = parseInt(j$('#payment_page_col').css('padding-bottom').replace("px", ""));
                  
                if((iframeHeight+iframeTop+paddingBottom) > (batchItemFormHeight+batchItemFormTop)) {
                    // need to scroll down
                    j$('#new-batch-item-form').scrollTop((iframeHeight+iframeTop+paddingBottom)-(batchItemFormHeight+batchItemFormTop));
                    // j$('#new-batch-item-form').animate({scrollTop: ((iframeHeight+iframeTop+paddingBottom)-(batchItemFormHeight+batchItemFormTop))}, 'slow');
                } 
                
                // lets display overlay
                displayOverLay();           
            },
            
            closePaymentPage: function(batchEntryId, authTransactionId, processedOffline) {
                var t = this;      
                var prevRowEl = j$('#payment_page_row').prev();
                
                if(null == prevRowEl || prevRowEl.length == 0) {
                    prevRowEl = Convio.BatchPageUtils.getActiveRow();
                }
                
                /*var rowId = prevRowEl.attr('id');
                var rowIdParts = rowId.split('-');
                var rowNum = rowIdParts[rowIdParts.length-1];*/
                var rowNum = getWidget('num').getWidgetValue();
        
                var parentEl = null;
                var paymentTypeVal = null;
                if(prevRowEl.hasClass('editDataRow')) {
                    parentEl = j$('#edit-row-' + addNamespace('payment_type__c')).parent();
                    paymentTypeVal = j$('#edit-row-' + addNamespace('payment_type__c')).find('div.input-item-class').find('select').val();
                } else {
                    parentEl = j$('#' + prevRowEl.attr('id') + '-column-' + addNamespace('payment_type__c')).parent();
                    paymentTypeVal = j$('#' +prevRowEl.attr('id') + '-column-' + addNamespace('payment_type__c')).find('div#' + addNamespace('payment_type__c') + '-value').text();
                }
                 
                j$('#payment_page_row').remove();
                // hide overlay
                hideOverLay();
        
                var paymentTypeFieldData = {};
                paymentTypeFieldData.authTransactionId = authTransactionId;
                paymentTypeFieldData.processedOffline = processedOffline;
                paymentTypeFieldData.fieldValue = paymentTypeVal;
                paymentTypeFieldData.fieldName = addNamespace('payment_type__c');
                paymentTypeFieldData.rowNum = rowNum;  
                paymentTypeFieldData.batchEntryId = batchEntryId;      

                t.renderPaymentTypeField(paymentTypeFieldData, parentEl);          
        
                // scroll to original position.
                //j$('#new-batch-item-form').animate({scrollTop: Convio.BatchPageUtils.originalScrollTop}, 'slow');
                
                // j$('#new-batch-item-form').scrollTop(Convio.BatchPageUtils.originalScrollTop);
            },
            
            renderPaymentTypeField: function(paymentTypeFieldData, parentEl) {
                var t = this;
                var rowNum = paymentTypeFieldData.rowNum;
                var editRow = false;
                if(parentEl && parentEl.hasClass('editDataRow')) {
                    editRow = true;
                }

                var columnData;
                if(!editRow) {
                    t.renderPaymentPageLinks(paymentTypeFieldData, parentEl, false);
                } else {
                    var authTransactionId = paymentTypeFieldData.authTransactionId;
                    var processedOffline = paymentTypeFieldData.processedOffline;

                    var inputItemDiv = parentEl.find('#edit-row-' + 'payment_type__c').find('div.input-item-class');
                    inputItemDiv.find('span#edit-row-' + 'payment_type__c' + '-value').remove();
                    inputItemDiv.find('span#authtransactionid-span').remove();
                    inputItemDiv.find('span#processedoffline-span').remove();
                    inputItemDiv.find('span').removeClass('hidden');
                    if((authTransactionId && authTransactionId > 0) || (processedOffline && processedOffline == 'true')) {
                        inputItemDiv.find('span').addClass('hidden');
                        j$('<span id="edit-row-' + "payment_type__c" + '-value">' + paymentTypeFieldData.fieldValue + '</span>').appendTo(inputItemDiv);            
                        j$('<span id="authtransactionid-span"><input type="hidden" id="authTransactionId" name="authTransactionId" value="' + authTransactionId + '"/>').appendTo(inputItemDiv);
                        j$('<span id="processedoffline-span"><input type="hidden" id="processedoffline" name="processedoffline" value="' + processedOffline + '"/>').appendTo(inputItemDiv); 
                    }
                    
                    t.renderPaymentPageLinks(paymentTypeFieldData, parentEl.find('td#edit-row-' + addNamespace('payment_type__c')), true);
                }        
            },            
            
            renderPaymentPageLinks: function(paymentTypeFieldData, parentEl, editRow) {
                var t = this;
                var rowNum = paymentTypeFieldData.rowNum;
                var batchEntryId = paymentTypeFieldData.batchEntryId;
                if(batchEntryId == undefined) {
                    batchEntryId = '';
                }

                if(editRow == undefined) {
                    editRow = false;
                }

                var paymentDetailLink = '<div id="payment_detail_link_div"><a id="payment_detail_link" href="javascript:void(0);">Payment Details</a></div>';
                var offlinePaymentLink = '<div id="offline_payment_link_div" class="subStackField">Offline Payment <a id="edit-offline-paymentinfo" href="javascript:void(0);">[edit]</a></div>';
                var enterPaymentLink = '<div id="enter_payment_link_div"><a id="enter-paymentinfo-link" href="javascript:void(0);">Enter Payment Data</a></div>';

                if(parentEl) {
                    var paymentInfoLinkDiv = parentEl.find('div#payment_type_action_link');
                    if(!paymentInfoLinkDiv || paymentInfoLinkDiv.length == 0) {
                        paymentInfoLinkDiv = j$('<div id="payment_type_action_link"></div>');
                        paymentInfoLinkDiv.appendTo(parentEl);
                    }

                    // lets clear out contents of payment info link element.
                    paymentInfoLinkDiv.children().remove();      

                    if(paymentTypeFieldData.authTransactionId && paymentTypeFieldData.authTransactionId != '-1') {
                        j$(paymentDetailLink).click(function(e) {
                            if(e) {
                                e.stopPropagation();
                                e.cancelBubble = true;
                            }
                            getWidget('payment_type__c').displayPaymentDetails(e, rowNum);
                        }).appendTo(paymentInfoLinkDiv);
                    } else if(paymentTypeFieldData.processedOffline == 'true') {
                        j$(offlinePaymentLink).click(function(e) {
                            getWidget('payment_type__c').openPaymentPage(batchEntryId, rowNum);
                        }).appendTo(paymentInfoLinkDiv);
                    } else if(('Credit Card' == paymentTypeFieldData.fieldValue || 
                               'ACH' == paymentTypeFieldData.fieldValue) &&
                              editRow) {                        
                        j$(enterPaymentLink).click(function(e) {
                            getWidget('payment_type__c').checkRequiredDataAndOpenPaymentPage(batchEntryId, rowNum);
                        }).appendTo(paymentInfoLinkDiv);                        
                    }
                }
            },
            
            displayPaymentDetails: function(e, rowNum, successMessage) {
                var t = this;
                // rowObj = rowObj || Convio.BatchPageUtils.getActiveRow();
                var rowObj = j$('#batch-row-' + rowNum);
                var numOfColumns = Convio.BatchPageUtils.getBatchFields().length;
                if(rowObj) {
                    rowObj.after('<tr id="payment_details_row_' + rowNum + '"><td id="payment_details_col" colspan="' + (numOfColumns-2) + '">' + Convio.PaymentDetailsWidget.getPaymentDetailsHTML(e) + '</td></tr>');
                    
                    var getPaymentDetailCallback = function(result, event) {
                        if(result) {
                            var paymentDetailsRowEl = j$('#payment_details_row_' + rowNum);
                            if(paymentDetailsRowEl) {
                                if(successMessage) {
                                    // var imageHtml = j$('#message-content-block').find('span.message-content-success').html();
                                    paymentDetailsRowEl.find('#payment-detail-message-block').addClass('success');
                                    paymentDetailsRowEl.find('#message-content').html(successMessage);
                                    j$('#message-content-block').find('td#message-content-left-block span#message-content-success').children().appendTo(paymentDetailsRowEl.find('#message-content-icon'));
                                    // j$(imageHtml).appendTo(paymentDetailsRowEl.find('#message-content-icon'));
                                }                              
                                paymentDetailsRowEl.find('#billing_name').html(result.donorName);
                                paymentDetailsRowEl.find('#donation_amount').html(result.donationAmount);
                                paymentDetailsRowEl.find('#donation_type').html('Single Donation');
                                var closeDate = result.closeDate;
                                if(closeDate) {
                                    var dateTimeParams = closeDate.split('T');
                                    if(dateTimeParams && dateTimeParams.length > 0) {
                                        closeDate = dateTimeParams[0];
                                        var dateParams = closeDate.split('-');
                                        if(dateParams && dateParams.length == 3) {
                                            closeDate = dateParams[1] + '/' + dateParams[2] + '/' + dateParams[0];
                                        }
                                    }    
                                }
                                // paymentDetailsRowEl.find('#close_date').html(result.closeDate);
                                paymentDetailsRowEl.find('#close_date').html(closeDate);
                  
                                paymentDetailsRowEl.find('#tender_instance').html(result.tenderInstance);
                                paymentDetailsRowEl.find('#card_number').html(result.cardNum4Digits);
                                paymentDetailsRowEl.find('#exp_date').html(result.expDate);
                                paymentDetailsRowEl.find('#account_number').html(result.achAccountNumber);
                                paymentDetailsRowEl.find('#routing_number').html(result.routingNumber);                              
                  
                                paymentDetailsRowEl.find('#billing_street1').html(result.billingStreet1);
                                paymentDetailsRowEl.find('#billing_city_state_zipcode').html(result.city + ', ' + result.state + ' ' + result.zipCode);
                                //paymentDetailsRowEl.find('#billing_state').html(result.state);
                                //paymentDetailsRowEl.find('#billing_zipcode').html(result.zipCode);
                                paymentDetailsRowEl.find('#billing_country').html(result.country);
                                var editPaymentLinkEl = j$('<a href="#" id="editPaymentDetailsLink">Edit payment details</a>');
                                paymentDetailsRowEl.find('#editPaymentDetailsSpan').append(editPaymentLinkEl);
                              
                                paymentDetailsRowEl.find('button#closePaymentDetailsButton').click(function() {
                                    paymentDetailsRowEl.remove();
                                    /*if(batchFields) {
                                        for(var i=0;i<batchFields.numColumns;i++) {
                                            if(batchFields.wrapperList[i].fieldName == addNamespace('payment_type__c')) {
                                                // is this the last field ?
                                                if(i == batchFields.wrapperList.length-1) {
                                                // move to next field.
                                                } else {
                                                    var nextField = batchFields.wrapperList[i+1];
                                                    var inputEl = j$('#edit-row-' + addNamespace(nextField.fieldName)).find('div.input-item-class input');
                                                    var selectEl = j$('#edit-row-' + addNamespace(nextField.fieldName)).find('div.input-item-class select');
                                                    var specialCaseLink = j$('#edit-row-' + addNamespace(nextField.fieldName)).find('div.input-item-class div.specialCaseDiv a');
                                            
                                                    if(specialCaseLink && specialCaseLink.length == 1) {
                                                        specialCaseLink[0].focus();
                                                    } else if(selectEl && selectEl.length == 1) {
                                                        selectEl[0].focus();
                                                    } else if(inputEl && inputEl.length == 1) {
                                                        inputEl[0].focus();
                                                    }
                                                }
                                            }                                      
                                        }
                                    }*/
                                });
                              
                                editPaymentLinkEl.click(function(e) {
                                    if(e) {
                                        e.cancelBubble = true;
                                    }
                                    paymentDetailsRowEl.remove();
                                    t.openPaymentPage(null, rowNum);
                                });
                              
                                // focus on payment details button.
                                paymentDetailsRowEl.find('button#closePaymentDetailsButton').focus();
                            }                        
                        }
                    };
                    
                    BatchController.getPaymentDetails(getBatchId(), rowNum, getPaymentDetailCallback);
                }
            },            
            
            saveAuthorizedTransactionId : function(batchEntryId, authTransactionId, processedOffline) {
                var t = this;
                var paymentInfo = {};
                if(authTransactionId && authTransactionId != '-1' && isNaN(authTransactionId)) {
                   paymentInfo.authTransactionId = authTransactionId; 
                } else if(processedOffline) {
                   paymentInfo.processedOffline = 'true';
                }
        
                paymentInfo.processedOffline = processedOffline;                
                var callback = function() {
                    t.closePaymentPage(batchEntryId, authTransactionId, processedOffline);
                    if(null != authTransactionId && authTransactionId != '-1') {
                        // lets display payment details.
                        t.displayPaymentDetails(null, Convio.BatchPageUtils.getActiveRow(), 'Payment information was saved.');
                    }
                };
        
                paymentInfo = {};
                getController().saveAuthorizationId(batchEntryId, authTransactionId, processedOffline, callback);            
            }            
        }); // end of PaymentTypeField subclass

        // recordtypeid
        var RecordTypeField = j$.inherit(DefaultWidget, {

            createField: function() {
                this.__base();

                var f = this.getContainer();
                f.find('select option').each(function() {
                    var elm = j$(this);
                    var text = elm.html();
                    elm.val(text);
                });
            }
        });

        // segment_code__c
        var SegmentCodeField = j$.inherit(DefaultWidget, {

            createField : function() {
                var t = this;
                this.__base();
                var container = this.getContainer();
                var segmentCodeIdName = this.getFieldName();
                container.addClass('specialIcon').addClass('divWithIcon');
                var searchSegmentLinkElm = j$('<a>').prop('id', segmentCodeIdName + '-link').prop('href', 'javascript:void(0);');
                this.searchSegmentLinkElm = searchSegmentLinkElm;
                getLookupIconElm().appendTo(searchSegmentLinkElm);
                searchSegmentLinkElm.appendTo(container);   

                // add click events 
                var editSegmentCodeInputElm = container.find('input');

                function _segmentCodeMatchClickEvent(e) {
                    var segmentCodeValue = t.getWidgetValue();

                    var matchSegmentCodeCallback = function(result, event) {
                        hideSpinner();
                        if(event.status && event.result) {
                          var campaignItem = event.result;
                          var campaignObj = campaignItem['Campaign__r'];
                          if(campaignObj) {
                            var campaignName = campaignObj.Name;

                            getWidget("campaignid").setWidgetValue({campaignid:campaignName});

                            var defaultDesignationObj = campaignObj['Default_Designation__r'];
                            if(defaultDesignationObj) {
                              var defaultDesignationName = defaultDesignationObj.Name
                              if(defaultDesignationName && defaultDesignationName != '') {
                                // replace out the designation
                                getWidget('designation__c').setWidgetValue({designation__c: defaultDesignationName});
                              }
                            }
                          }
                          var successString = 'Segment code found.';
                          Convio.ErrorInfoUtils.showInlineSuccess(successString);
                        } else {
                            var errorString = 'The specified Segment Code was not found in the system.  Please specify a valid code for use with the update.';
                            Convio.ErrorInfoUtils.showInlineError(errorString, e.currentTarget);
                        }
                    };

                    // lets display spinner here while we search for segment code
                    displaySpinner();
                    getController().matchSegmentCode(segmentCodeValue, matchSegmentCodeCallback, {escape: true});
                }

                searchSegmentLinkElm.click(_segmentCodeMatchClickEvent);
                editSegmentCodeInputElm.keypress(function(e) {
                    switch(e.keyCode) {
                    case 13: // enter
                        _segmentCodeMatchClickEvent(e);
                        break;
                    }
                });       
            }

        }); // end of SegmentCodeField

        var SpecialCaseWidget = j$.inherit(DefaultWidget, {
            _specialCaseValue: null,
            __constructor: function(data, o) {
                this.__base(data);
                this.tagName = o.tagName || 'div';
                this.linkText = o.linkText || 'Configure';
                this.dialogItem = o.dialogItem || null;
                this.__specialCaseValue = null;
            },
            createField: function() {
              var t = this;  
              t.__base();
              t.dialogItem.initialize();
              var containerElement = t.getContainer();
              
              var elmType = '<' + t.tagName + '>';

              var specialContentElm = j$(elmType)
                  .addClass('specialCase')
                  .appendTo(containerElement);
              
              var innerElm = j$(elmType)
                  .addClass('specialContent')
                  .appendTo(specialContentElm);
              
              var specialAtagElm = j$('<a>').addClass('specialContentLink')
                      .prop('id', _SPECIAL_LINK_TEXT_ + t.fieldName)
                      .attr('href', 'javascript:void(0);')
                      .html(t.linkText)
                      .appendTo(specialContentElm);
              
              this.__base();
              var t = this;
              var linkElement = t.getLinkElement();
              linkElement.click(function() {
                t.dialogItem.show(t._specialCaseValue);
              });
              // add close callback to dialog so
              // the element can be focused on upon closing
              var closeFunction = function() {
                var focusElm = linkElement;
                if(focusElm) {
                  focusElm.focus();
                  if(focusElm.tagName && focusElm.tagName.toLowerCase() == 'input') {
                    focusElm.select();
                  }
                }
              };
              this.dialogItem.dialog.dialog('option', 'close', closeFunction);
            },
            getDisplayValue: function(data) {
                var specialCaseString = data[this.fieldName] || '';
                var retVal = '';
                var dataCount = specialCaseString.split(';').length;
                if(specialCaseString != '' && dataCount > 0) {
                    retVal += dataCount + ' ' + this.getHeaderLabel();
                }
                return retVal;
            },
            setSpecialCaseEditDisplayValue: function(specialCaseString) {
              var t = this;
              var specialCaseString = specialCaseString || '';
              var retVal = '';
              var dataCount = specialCaseString.split(';').length;
              if(specialCaseString != '' && dataCount > 0) {
                  retVal += dataCount + ' ' + t.getHeaderLabel();
              }
              t.getContainer().find('.specialContent').html(retVal);
            },
            setWidgetValue: function(editRowData) {
              var t = this;
              t._specialCaseValue = editRowData[t.getFieldName()] || '';
              t.setSpecialCaseEditDisplayValue(t._specialCaseValue);
            },
            getWidgetValue: function() {
              return this._specialCaseValue;
            },
            getLinkElement: function() {
              return this.getContainer().find('.specialContentLink');
            }
        });
        
        var SoftCreditsWidget = j$.inherit(SpecialCaseWidget, {
          __constructor: function(data) {
              this.__base(data, {dialogItem: Convio.ContactRolesUtils});
          },
          createField: function() {
            var t = this;
            t.__base();
            // assign the set callback to the dialog item
            function selectCallback(newString) {
              var newData = {};
              newData[t.getFieldName()] = newString
              t.setWidgetValue(newData);
            };
            t.dialogItem.setUpdateCallback(selectCallback);
          }
        });

        var GiftAssetsWidget = j$.inherit(SpecialCaseWidget, {
          __constructor: function(data) {
          this.__base(data, {dialogItem: Convio.GiftAssetsUtils});
        },
        createField: function() {
          var t = this;
          t.__base();
          // assign the set callback to the dialog item
          function selectCallback(newString, isAmount) {
            var newData = {};
            newData[t.getFieldName()] = newString;
            if(isAmount) {
              getWidget('amount').setWidgetValue({amount: newString});
            } else {
              t.setWidgetValue(newData);
            }
          };
          t.dialogItem.setUpdateCallback(selectCallback);
        }
      });
      
        var OpenDonationWidget = j$.inherit(SpecialCaseWidget, {
            openGiftInfo: null,
            __constructor: function(data) {
              this.__base(data, {dialogItem: Convio.OpenDonationUtils});
            },
            _getConfigureElement: function() {
              return this.getContainer().find('.specialContentLink');
            },
            _getRemoveElement: function() {
              return this.getContainer().find('.specialContentRemoveLink');
            },
            createField: function() {
              var t = this;  
              t.__base();
              t.dialogItem.initialize();
              var linkElement = t.getLinkElement();
              
              // unbind existin click event to add new one
              linkElement.unbind('click').click(function() {
                var contactInfo = getWidget('contact__c').getContactInfo();
                t.dialogItem.showConfigure(contactInfo);
              });
                
              var specialContentElm = t.getContainer().find('.specialCase');
              var specialAtagElm = j$('<a>').addClass('specialContentRemoveLink')
                .prop('id', _SPECIAL_LINK_TEXT_ + 'remove-'+ t.fieldName)
                .attr('href', 'javascript:void(0);')
                .html('Remove')
                .addClass('hidden')
                .appendTo(specialContentElm)
                .click(function() {
                  var contactInfo = getWidget('contact__c').getContactInfo();
                  var removeButtons = {
                      'OK': function() {
                          Convio.OpenDonationUtils.clearOpenDonation();
                          Convio.OpenDonationUtils.close();
                      },
                      'Cancel': function() {
                          Convio.OpenDonationUtils.close();
                      }
                  };
                  t.dialogItem.dialog.dialog('option', 'buttons', removeButtons);
                  t.dialogItem.showRemove(contactInfo);
                });
            },
            setSpecialCaseEditDisplayValue: function(value) {
              this.getContainer().find('.specialContent').html(value);
            },
            setWidgetValue: function(editRowData) {
              var t = this;
              t.openGiftInfo = {
                 opportunityid: editRowData.opportunityid || '',
                 checkforopengifts: editRowData.checkforopengifts || 'true' 
              };
              t.openGiftInfo[this.getFieldName()] = editRowData[this.getFieldName()];
              t.__base(editRowData);
              // determine the state
              var currentWidgetVal = t.getWidgetValue().opportunityid || '';
              var hasWidgetValue = (currentWidgetVal != '');
              if(hasWidgetValue) {
                // show remove mode
                t._getRemoveElement().removeClass('hidden');
                t._getConfigureElement().addClass('hidden');
              } else {
                // show configure mode
                t._getRemoveElement().addClass('hidden');
                t._getConfigureElement().removeClass('hidden');
              }
            },
            getDisplayValue : function(data) {
              return data[this.getFieldName()] || '';
            },
            getWidgetValue : function() {
              return this.openGiftInfo;
            },
            getSaveString: function(rowdata) {
              str = (rowdata[this.getFieldName()] || '') != '' ? this.getComplexName() + '=' + rowdata[this.getFieldName()] : '';
              //str += '&OpportunityId=' + rowdata.opportunityid;
              //str += '&checkforopengifts=' + rowdata.checkforopengifts;
              return str;
            }
        }); // end OpenDonationWidget

        // childclass of DefaultWidget (donor_external_id)
        var DonorIdField = j$.inherit(SpecialCaseWidget, {
          __constructor: function(data) {
            this.__base(data, {dialogItem: Convio.DonorIdUtils, tagName: 'span'});
          },
          createField : function() {
            this.__base();
            // unbind click event as we'll rebind later
            var linkElement = this.getLinkElement().unbind('click').html('').append(getLookupIconElm());
            function selectCallback(contactInfo) {
              // set the edit value
              // replace out the contact info
              getWidget('contact__c').setContactInfo(contactInfo);
              getWidget('contact__c').setContactValue(contactInfo.name);
              //console.debug('TODO: implement DonorExternalId createField selection callback');
            }; 
            // set the selection callback
            this.dialogItem.contactSelectCallback = selectCallback;
            this.getContainer().addClass('divWithIcon');
            var containerElm = this.getContainer();
            var closeFunction = function() {
              var focusElm = linkElement;
              if(focusElm) {
                focusElm.focus();
                if(focusElm.tagName && focusElm.tagName.toLowerCase() == 'input') {
                  focusElm.select();
                }
              }
            };
            this.dialogItem.dialog.dialog('option', 'close', closeFunction);
            
            var t = this;
            function executeDonorIdSearch(focusItem) {
              var donorIdVal = t.getWidgetValue();
              t.dialogItem.show(donorIdVal, focusItem);
            };
            
            var inputElm = j$('<input>')
                .prop('id', 'special-case-link-input-' + this.getFieldName())
                .prependTo(this.getContainer().find('.specialCase'))
                .bind('keydown', function() {
                  if(event.which == 13) {// enter
                    executeDonorIdSearch(inputElm);
                  }
                });
            linkElement.click(function() {
              executeDonorIdSearch(linkElement);
            });
          },
          getDisplayValue : function(data) {
            return data[this.getFieldName()] || '';
          },
          getWidgetValue: function() {
            return this.getContainer().find('input').val();
          },
          setWidgetValue: function(editRowData) {
            this.getContainer().find('input').val(editRowData[this.getFieldName()]);
          }
        }); // end of DonorIdField

        // num
        var NumField = j$.inherit(DefaultWidget, {
          createField: function() {
            this.getContainer().parents('td.dataCell').addClass('smallWidth');
          },

          getDisplayValue: function(data) {
            return data.rowix;
          },

          setWidgetValue: function(editRowData) {
            var rowId = editRowData.rowix;
            this.getContainer().html(rowId);
          }
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


        // Gift Type widget.
        var GiftTypeWidget = j$.inherit(DefaultWidget, {
            // override 

            GIFT_TYPES: [
                {name: 'Single Donation'}, 
                {name: 'Pledge'},
                {name: 'Recurring Gift'}
            ],

            // The panel that contains the formlet for editing pledge/recurring gift info
            _panel: null,

            __constructor: function(data) {
                this.__base(data);

                // Mark the field as required.
                this._isRequired = true;
                this._data.isRequired = true;
            },

            /**
             * Create a gift type widget:
             *
             *  <select id="gift-type-selector">...</select>
             *  <div id="gift-type-selection">
             *    <span id="gift-type-selection-value"></span>
             *    <a id="gift-type-edit-link" href="#">Edit</a> 
             *  </div>
             *  <div id="gift-type-panel"></div>
             *
             */
            createField: function() {
                this.__base();

                var t = this;
                var c = this.getContainer();

                // Create the picklist.
                var select = j$('<select>')
                    .attr('id', 'gift-type-selector')
                    .change(function() {
                        t.onChange();
                    })
                    .appendTo(c);
                for (var i=0; i<this.GIFT_TYPES.length; i++) {
                    var gtype = this.GIFT_TYPES[i].name;
                    j$('<option>')
                        .val(gtype)
                        .html(gtype)
                        .appendTo(select);
                }

                // Create the container for displaying the selected value.
                var selection = j$('<div>')
                    .attr('id', 'gift-type-selection')
                    .appendTo(c);

                var display = j$('<span>')
                    .attr('id', 'gift-type-selection-value')
                    .appendTo(selection);

                // space
                j$('<span>')
                    .html(' ')
                    .appendTo(selection);

                // Create the edit link.
                var a = j$('<a>')
                    .attr('id', 'gift-type-edit-link')
                    .attr('href', '#')
                    .html('Edit')
                    .click(function(event) {
                        event.preventDefault();
                        t.onEdit();
                    })
                    .appendTo(selection);

                // Initialize the gift type panel.
                var row = c.closest('tr.dataRow');
                var nColumns = row.children('td').length;
                this._panel = j$('<tr>')
                    .attr('id', 'gift-type-panel')
                    .addClass('editDataPanel')
                    .html('<td id="gift-type-formlet-container" style="width:100%;" colspan="' + nColumns + '"></td>')
                    .insertAfter(row)
                    .hide();
            },

            setWidgetValue: function(data) {
                var giftType = data['gifttype'] || null;
                this._setGiftType(giftType);
            },

            /**
             * Update the widget state based on the gift type.
             *
             * @param giftType The gift type
             */
            _setGiftType: function(giftType) {
                var c = this.getContainer();
                var selector = c.find('#gift-type-selector');
                var selection = c.find('#gift-type-selection');
                var selectionV = c.find('#gift-type-selection-value');

                // Update the selection.
                c.find('#gift-type-selection-value').val(giftType);

                if (giftType === null) {
                    // No gift type has been selected.

                    // Show the selector only.
                    selector.show();
                    selection.hide();
                    if (this._panel.is(':visible')) {
                        this._panel.slideUp('slow');
                    }
                    this._panel.appendTo(j$('#data-result-edit tbody'));

                } else if (giftType === 'Single Donation') {
                    // Single Donation gift. 

                    // Show the selection only.
                    selector.hide();
                    selection.show();

                    if (this._panel.is(':visible')) {
                        this._panel.slideUp('slow');
                    }
                    this._panel.appendTo(j$('#data-result-edit tbody'));

                } else {
                    // Non-single donation gift type. 

                    // Show the selection and panel.
                    selector.hide();
                    selection.show();

                    // Swap out the current formlet.
                    var fContainer = this._panel.find('#gift-type-formlet-container');
                    fContainer.find('.gift-type-formlet').appendTo(j$('#gift-type-formlets'));

                    // Swap in the formlet that applies to this gift type.
                    var formlet = null;
                    switch (giftType) {
                    case 'Pledge':
                        formlet = j$('#pledge-formlet');
                        break;
                    case 'Recurring Gift':
                        formlet = j$('#recurring-gift-formlet');
                        break;
                    default: 
                        formlet = null;
                    }

                    if (formlet && formlet.length) {
                        formlet.appendTo(fContainer);
                    }

                    this._panel.insertAfter(c.closest('tr.dataRow'));
                    if (! this._panel.is(':visible')) {
                        this._panel.slideDown('slow');
                    }
                }

                selector.val(giftType || 'Single Donation');
                selectionV.html(giftType || 'Single Donation');
            },

            getWidgetValue: function() {
                // TODO: implement me for real.
                return j$('#gift-type-selector').val();
            },

            getDisplayValue: function(data) {
                return data['gifttype'] || '';
            },

            getSaveString: function(rowdata) {
                // TODO: implement me
                return null;
            },

            /**
             * Change handler for the gift type select list.
             * Swap gift type and reset the formlet.
             */
            onChange: function() {
                var oldGiftType = j$('#gift-type-selection').text();
                var giftType = j$('#gift-type-selector').val();

                this._setGiftType(giftType);
                // TODO: Reset form state.
            },

            /**
             * Click handler for the edit link.
             * After confirmation show the gift type picker.
             */
            onEdit: function() {
                var c = this.getContainer();
                var target = c.find('#gift-type-edit-link');
                var giftType = j$('#gift-type-selector').val();

                var msg = 'Changing the Gift Type will clear all previously entered ' + giftType + ' data. Do you wish to proceed?';
                var doEdit = function() {
                    // Show the selector. Hide the selection.
                    c.find('#gift-type-selector').show();
                    c.find('#gift-type-selection').hide();
                };
                Convio.ErrorInfoUtils.showDialog(msg, {'Ok':doEdit,'Cancel':null}, target);
            }

        }); // end of GiftType widget

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
