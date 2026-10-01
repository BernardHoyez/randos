package fr.bernardhoyez.randos;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Lecture de fichiers MBTiles (SQLite) pour Capacitor.
 *
 * Méthodes exposées au JavaScript :
 *   pick()                       -> sélecteur de fichier (SAF) + copie dans le stockage de l'app
 *   list()                       -> { files: [{name, size}] }
 *   open({name})                 -> { name, metadata: {...} }
 *   getTile({name, z, x, y})     -> { data: <base64> }   (y en convention XYZ, inversé ici en TMS)
 *   close({name}) / remove({name})
 */
@CapacitorPlugin(name = "Mbtiles")
public class MbtilesPlugin extends Plugin {

    private final Map<String, SQLiteDatabase> dbs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    // ------------------------------------------------------------------ utilitaires

    private File dir() {
        File d = new File(getContext().getFilesDir(), "mbtiles");
        //noinspection ResultOfMethodCallIgnored
        d.mkdirs();
        return d;
    }

    private static String safeName(String name) {
        String n = name == null ? "carte.mbtiles" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (!n.toLowerCase().endsWith(".mbtiles")) n += ".mbtiles";
        return n;
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return c.getString(i);
            }
        } catch (Exception ignored) {
        }
        return "carte.mbtiles";
    }

    private void closeDb(String name) {
        SQLiteDatabase db = dbs.remove(name);
        if (db != null && db.isOpen()) db.close();
    }

    // ------------------------------------------------------------------ pick

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*"); // .mbtiles n'a pas de type MIME reconnu
        startActivityForResult(call, intent, "onPicked");
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            call.reject("Sélection annulée");
            return;
        }
        final Uri uri = result.getData().getData();
        executor.execute(() -> {
            try {
                File dest = new File(dir(), safeName(displayName(uri)));
                closeDb(dest.getName());
                try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                     OutputStream out = new FileOutputStream(dest)) {
                    if (in == null) throw new Exception("Flux illisible");
                    byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
                JSObject ret = new JSObject();
                ret.put("name", dest.getName());
                ret.put("size", dest.length());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Copie impossible : " + e.getMessage());
            }
        });
    }

    // ------------------------------------------------------------------ list / open / close / remove

    @PluginMethod
    public void list(PluginCall call) {
        JSArray arr = new JSArray();
        File[] files = dir().listFiles();
        if (files != null) {
            for (File f : files) {
                if (!f.getName().toLowerCase().endsWith(".mbtiles")) continue;
                JSObject o = new JSObject();
                o.put("name", f.getName());
                o.put("size", f.length());
                arr.put(o);
            }
        }
        JSObject ret = new JSObject();
        ret.put("files", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void open(PluginCall call) {
        final String name = call.getString("name");
        if (name == null) {
            call.reject("name manquant");
            return;
        }
        executor.execute(() -> {
            try {
                File f = new File(dir(), safeName(name));
                if (!f.exists()) throw new Exception("Fichier introuvable");
                closeDb(f.getName());
                SQLiteDatabase db = SQLiteDatabase.openDatabase(
                        f.getAbsolutePath(), null, SQLiteDatabase.OPEN_READONLY);
                JSObject meta = new JSObject();
                try (Cursor c = db.rawQuery("SELECT name, value FROM metadata", null)) {
                    while (c.moveToNext()) meta.put(c.getString(0), c.getString(1));
                }
                dbs.put(f.getName(), db);
                JSObject ret = new JSObject();
                ret.put("name", f.getName());
                ret.put("metadata", meta);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Ouverture impossible (fichier MBTiles valide ?) : " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        String name = call.getString("name");
        if (name != null) closeDb(name);
        call.resolve();
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String name = call.getString("name");
        if (name == null) {
            call.reject("name manquant");
            return;
        }
        closeDb(name);
        File f = new File(dir(), safeName(name));
        boolean ok = !f.exists() || f.delete();
        if (ok) call.resolve();
        else call.reject("Suppression impossible");
    }

    // ------------------------------------------------------------------ tuiles

    @PluginMethod
    public void getTile(PluginCall call) {
        final String name = call.getString("name");
        final Integer z = call.getInt("z");
        final Integer x = call.getInt("x");
        final Integer y = call.getInt("y");
        if (name == null || z == null || x == null || y == null) {
            call.reject("paramètres manquants");
            return;
        }
        executor.execute(() -> {
            SQLiteDatabase db = dbs.get(name);
            if (db == null || !db.isOpen()) {
                call.reject("Base non ouverte");
                return;
            }
            // MBTiles stocke les lignes en TMS (origine en bas) ; Leaflet/XYZ a l'origine en haut.
            int tmsY = (1 << z) - 1 - y;
            JSObject ret = new JSObject();
            try (Cursor c = db.rawQuery(
                    "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
                    new String[]{String.valueOf(z), String.valueOf(x), String.valueOf(tmsY)})) {
                if (c.moveToFirst()) {
                    byte[] blob = c.getBlob(0);
                    if (blob != null) ret.put("data", Base64.encodeToString(blob, Base64.NO_WRAP));
                }
                call.resolve(ret); // sans "data" = tuile absente
            } catch (Exception e) {
                call.reject("Lecture tuile : " + e.getMessage());
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (SQLiteDatabase db : dbs.values()) {
            if (db.isOpen()) db.close();
        }
        dbs.clear();
        executor.shutdown();
    }
}
