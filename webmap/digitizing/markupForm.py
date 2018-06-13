from PyQt4.QtCore import *
from PyQt4.QtGui import *

def formOpen(dialog,layerid,featureid):	
	global nameField
	nameField = dialog.findChild(QLineEdit,"name")
	global regionField
	regionField = dialog.findChild(QComboBox,"region")
	global characField
	characField = dialog.findChild(QLineEdit,"character")
	global riskField
	riskField = dialog.findChild(QLineEdit,"risk")
	global uphillField
	uphillField = dialog.findChild(QLineEdit,"uphill_pain")
	global landscField
	landscField = dialog.findChild(QLineEdit,"landscape")
	global shuttleField
	shuttleField = dialog.findChild(QLineEdit,"shuttle")
	global conflField
	conflField = dialog.findChild(QLineEdit,"conflict")	
	global descrField
	descrField = dialog.findChild(QPlainTextEdit,"description")
	nameField.textChanged.connect( newDescr )
	regionField.currentIndexChanged.connect( newDescr )
	characField.textChanged.connect( newDescr )
	riskField.textChanged.connect( newDescr )
	uphillField.textChanged.connect( newDescr )
	landscField.textChanged.connect( newDescr )
	shuttleField.textChanged.connect( newDescr )
	conflField.textChanged.connect( newDescr )

def newDescr():
	descrField.setPlainText('<div id="topic" style="float:left;">Name:</br>Region:</br>Charakter:</br>Risiko:</br>Uphill Pain:</br>Landschaft:</br>Konflikt:</br>Aufstiegshilfe:</div><div id="topic-text">' +	
	nameField.text() + '</br>' + regionField.currentText() + '</br>' +
	characField.text() + '</br>' + riskField.text() + '</br>' + uphillField.text() + '</br>' + 
	landscField.text() + '</br>' + conflField.text() + '</br>' + shuttleField.text() + '</div>')