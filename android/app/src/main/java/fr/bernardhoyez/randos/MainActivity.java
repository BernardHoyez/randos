package fr.bernardhoyez.randos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins locaux doivent être enregistrés AVANT super.onCreate
        registerPlugin(MbtilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
